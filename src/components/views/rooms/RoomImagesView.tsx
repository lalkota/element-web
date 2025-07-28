/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, useMemo, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { Text } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import { mediaFromMxc } from "../../../customisations/Media";
import { formatDate } from "../../../DateUtils";
import { fileSize } from "../../../utils/FileUtils";
import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import RoomSearchHeader from "./RoomSearchHeader";

interface IProps {
    room: Room;
}

interface ImageEvent {
    event: MatrixEvent;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    fileSize?: number;
    timestamp: number;
    sender: string;
}

export default function RoomImagesView({ room }: IProps): JSX.Element {
    const [imageEvents, setImageEvents] = useState<ImageEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const { searchQuery, selectedDate } = useRoomSearch();

    const loadImages = useCallback(async () => {
        if (!room) return;

        setLoading(true);
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        
        const images: ImageEvent[] = [];
        
        for (const event of events) {
            if (event.getType() === EventType.RoomMessage) {
                const content = event.getContent();
                if (content.msgtype === MsgType.Image && content.url) {
                    const media = mediaFromMxc(content.url);
                    const thumbnailMedia = content.info?.thumbnail_url ? 
                        mediaFromMxc(content.info.thumbnail_url) : null;
                    
                    images.push({
                        event,
                        url: media.srcHttp || "",
                        thumbnailUrl: thumbnailMedia?.srcHttp || undefined,
                        filename: content.body || "Image",
                        fileSize: content.info?.size,
                        timestamp: event.getTs(),
                        sender: event.getSender() || "",
                    });
                }
            }
        }
        
        // Sort by timestamp (newest first)
        images.sort((a, b) => b.timestamp - a.timestamp);
        
        setImageEvents(images);
        setLoading(false);
    }, [room]);

    useEffect(() => {
        loadImages();
    }, [loadImages]);

    // Filter images based on search query and selected date
    const filteredImages = useMemo(() => {
        let filtered = imageEvents;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((image) => 
                image.filename.toLowerCase().includes(query) ||
                image.sender.toLowerCase().includes(query)
            );
        }

        // Filter by selected date
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            filtered = filtered.filter((image) => {
                const imageDate = new Date(image.timestamp);
                return imageDate.toDateString() === selectedDateObj.toDateString();
            });
        }

        return filtered;
    }, [imageEvents, searchQuery, selectedDate]);

    const handleImageClick = useCallback((imageEvent: ImageEvent) => {
        // TODO: Open image in lightbox/modal
        window.open(imageEvent.url, '_blank');
    }, []);

    if (loading) {
        return (
            <div className="mx_RoomImagesView mx_RoomImagesView--loading">
                <Text size="md" weight="medium">
                    Loading...
                </Text>
            </div>
        );
    }

    if (imageEvents.length === 0) {
        return (
            <div className="mx_RoomImagesView">
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomImagesView mx_RoomImagesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomImagesView_emptyTitle">
                        No images yet
                    </Text>
                    <Text size="sm" className="mx_RoomImagesView_emptyDescription">
                        Images shared in this room will appear here
                    </Text>
                </div>
            </div>
        );
    }

    if (filteredImages.length === 0) {
        return (
            <div className="mx_RoomImagesView">
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomImagesView mx_RoomImagesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomImagesView_emptyTitle">
                        No images found
                    </Text>
                    <Text size="sm" className="mx_RoomImagesView_emptyDescription">
                        Try adjusting your search or date filter
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div className="mx_RoomImagesView">
            <RoomSearchHeader room={room} showDateFilter={true} />
            <div className="mx_RoomImagesView_header">
                <Text size="lg" weight="semibold">
                    Images ({filteredImages.length})
                </Text>
            </div>
            <div className="mx_RoomImagesView_grid">
                {filteredImages.map((imageEvent) => (
                    <div
                        key={imageEvent.event.getId()}
                        className="mx_RoomImagesView_item"
                        onClick={() => handleImageClick(imageEvent)}
                    >
                        <div className="mx_RoomImagesView_imageContainer">
                            <img
                                src={imageEvent.thumbnailUrl || imageEvent.url}
                                alt={imageEvent.filename}
                                className="mx_RoomImagesView_image"
                                loading="lazy"
                            />
                        </div>
                        <div className="mx_RoomImagesView_itemInfo">
                            <Text size="sm" weight="medium" className="mx_RoomImagesView_filename">
                                {imageEvent.filename}
                            </Text>
                            <Text size="xs" className="mx_RoomImagesView_metadata">
                                {formatDate(new Date(imageEvent.timestamp))}
                                {imageEvent.fileSize && (
                                    <span> • {fileSize(imageEvent.fileSize, { base: 2, standard: "jedec" })}</span>
                                )}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
