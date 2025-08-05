/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useMemo, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import { formatDate } from "../../../DateUtils";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { RoomEvent } from "matrix-js-sdk/src/models/room";
import AccessibleButton from "../elements/AccessibleButton";
import ExternalLinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";
import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import RoomSearchHeader from "./RoomSearchHeader";

interface RoomLinksViewProps {
    room: Room;
}

interface LinkInfo {
    event: MatrixEvent;
    url: string;
    displayText: string;
    sender: string;
    timestamp: number;
    domain: string;
}

// URL regex pattern to match various URL formats
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

export default function RoomLinksView({ room }: RoomLinksViewProps): JSX.Element {
    const { searchQuery, selectedDate } = useRoomSearch();
    
    // Listen for room events to update when new messages arrive
    useEventEmitterState(room, RoomEvent.Timeline, () => room.getLiveTimeline().getEvents());
    useEventEmitterState(room, RoomStateEvent.Events, () => room.currentState);

    const links = useMemo(() => {
        const linkMap = new Map<string, LinkInfo>();
        
        try {
            const timelineEvents = room.getLiveTimeline().getEvents();
            
            for (const event of timelineEvents) {
                if (event.getType() !== EventType.RoomMessage) continue;
                
                const msgType = event.getContent().msgtype;
                if (msgType !== MsgType.Text && msgType !== MsgType.Emote && msgType !== MsgType.Notice) continue;
                
                const body = event.getContent().body;
                const formattedBody = event.getContent().formatted_body;
                
                if (!body && !formattedBody) continue;
                
                // Extract URLs from both plain text body and formatted body
                const textToSearch = formattedBody || body;
                const urlMatches = textToSearch.match(URL_REGEX);
                
                if (urlMatches) {
                    for (const url of urlMatches) {
                        // Clean up the URL (remove trailing punctuation that might be captured)
                        const cleanUrl = url.replace(/[.,;:!?]+$/, '');
                        
                        // Skip if we already have this URL
                        if (linkMap.has(cleanUrl)) continue;
                        
                        // Get display text (try to find context around the URL)
                        let displayText = cleanUrl;
                        const urlIndex = textToSearch.indexOf(url);
                        if (urlIndex > 0) {
                            const contextStart = Math.max(0, urlIndex - 50);
                            const contextEnd = Math.min(textToSearch.length, urlIndex + url.length + 50);
                            const context = textToSearch.substring(contextStart, contextEnd).trim();
                            if (context.length > url.length) {
                                displayText = context;
                            }
                        }
                        
                        // Extract domain from URL
                        let domain = cleanUrl;
                        try {
                            const urlObj = new URL(cleanUrl);
                            domain = urlObj.hostname;
                        } catch {
                            // Keep original URL if parsing fails
                        }
                        
                        linkMap.set(cleanUrl, {
                            event,
                            url: cleanUrl,
                            displayText: displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText,
                            sender: event.getSender() || '',
                            timestamp: event.getTs(),
                            domain,
                        });
                    }
                }
            }
        } catch (error) {
            logger.error("Error extracting links from room timeline:", error);
        }
        
        // Convert to array and sort by timestamp (newest first)
        return Array.from(linkMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    }, [room]);
    
    // Force re-render when search query or selected date changes
    React.useEffect(() => {
        console.log("Links search params changed - query:", searchQuery, "date:", selectedDate);
    }, [searchQuery, selectedDate]);
    
    // Filter links based on search query and selected date
    const filteredLinks = useMemo(() => {
        let filtered = links;
        console.log("Filtering links with query:", searchQuery, "and date:", selectedDate, "total links:", links.length);
        
        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(link => 
                link.url.toLowerCase().includes(query) ||
                link.domain.toLowerCase().includes(query) ||
                link.displayText.toLowerCase().includes(query)
            );
            console.log("After query filter:", filtered.length, "links remain");
        }
        
        // Filter by selected date
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            const startOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            
            filtered = filtered.filter(link => {
                const linkDate = new Date(link.timestamp);
                return linkDate >= startOfDay && linkDate < endOfDay;
            });
            console.log("After date filter:", filtered.length, "links remain");
        }
        
        return filtered;
    }, [links, searchQuery, selectedDate]);

    const handleLinkClick = (url: string): void => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Group links by date
    const groupedLinks = useMemo(() => {
        const groups: { [key: string]: LinkInfo[] } = {};
        
        filteredLinks.forEach(link => {
            const date = new Date(link.timestamp);
            const dateKey = formatDate(date);
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(link);
        });
        
        return groups;
    }, [filteredLinks]);

    return (
        <div className="mx_RoomLinksView">
            <RoomSearchHeader room={room} showDateFilter={true} />

            {/* Links Content */}
            <div className="mx_RoomLinksView_content">
                {Object.keys(groupedLinks).length === 0 ? (
                    <div className="mx_RoomLinksView_empty">
                        <div className="mx_RoomLinksView_empty_icon">
                            <ExternalLinkIcon width="48" height="48" />
                        </div>
                        <h3>No links found</h3>
                        <p>Links shared in this room will appear here</p>
                    </div>
                ) : (
                    Object.entries(groupedLinks).map(([dateKey, dateLinks]) => (
                        <div key={dateKey} className="mx_RoomLinksView_dateGroup">
                            <div className="mx_RoomLinksView_dateHeader">
                                {dateKey}
                            </div>
                            <div className="mx_RoomLinksView_linksList">
                                {dateLinks.map((link, index) => (
                                    <div key={`${link.url}-${index}`} className="mx_RoomLinksView_linkItem">
                                        <div className="mx_RoomLinksView_linkContent">
                                            <div className="mx_RoomLinksView_linkTitle">
                                                {link.domain}
                                            </div>
                                            <div className="mx_RoomLinksView_linkUrl">
                                                {link.url}
                                            </div>
                                        </div>
                                        <AccessibleButton
                                            className="mx_RoomLinksView_linkButton"
                                            onClick={() => handleLinkClick(link.url)}
                                            aria-label={`Open link: ${link.url}`}
                                        >
                                            <ExternalLinkIcon width="16" height="16" />
                                        </AccessibleButton>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
