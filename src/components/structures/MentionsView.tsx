/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useContext, useEffect, useState, useCallback, type ReactElement } from "react";
import { Room, MatrixEvent, NotificationCountType, RoomEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../languageHandler";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import Spinner from "../views/elements/Spinner";
import AccessibleButton from "../views/elements/AccessibleButton";
import RoomAvatar from "../views/avatars/RoomAvatar";
import ResizeNotifier from "../../utils/ResizeNotifier";
import MessageComposer from "../views/rooms/MessageComposer";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import BaseAvatar from "../views/avatars/BaseAvatar";
import { TimelineRenderingType, MainSplitContentType } from "../../contexts/RoomContext";
import { Layout } from "../../settings/enums/Layout";
import { ScopedRoomContextProvider } from "../../contexts/ScopedRoomContext";

interface MentionItem {
    room: Room;
    event: MatrixEvent;
    mentionCount: number;
}

interface IMentionsViewProps {
    resizeNotifier: ResizeNotifier;
    onClose?: () => void;
}

/**
 * Main panel view for displaying all mentions across rooms with reply capability
 */
export default function MentionsView({ resizeNotifier, onClose }: IMentionsViewProps): ReactElement {
    const client = useContext(MatrixClientContext);
    const [mentions, setMentions] = useState<MentionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMentions = useCallback(async () => {
        if (!client) return;
        
        try {
            const rooms = client.getVisibleRooms();
            const mentionItems: MentionItem[] = [];
            const userId = client.getUserId();

            if (!userId) {
                setMentions([]);
                setLoading(false);
                return;
            }

                for (const room of rooms) {
                    // Check if room has unread highlights (mentions)
                    const mentionCount = room.getUnreadNotificationCount(NotificationCountType.Highlight);
                    if (mentionCount > 0) {
                        // Get the room's timeline events
                        const timeline = room.getLiveTimeline();
                        const events = timeline.getEvents();
                        
                        // Find events that actually mention the user
                        const mentionEvents = events.filter(event => {
                            if (event.getType() !== "m.room.message") return false;
                            if (event.getSender() === userId) return false; // Don't include own messages
                            
                            // Note: We could add read receipt checking here in the future
                            // For now, we'll show all mentions regardless of read status
                            
                            const content = event.getContent();
                            if (!content.body) return false;
                            
                            // Check for proper mentions:
                            // 1. Direct user ID mention
                            if (content.body.includes(userId)) return true;
                            
                            // 2. Display name mention
                            const userDisplayName = room.getMember(userId)?.name;
                            if (userDisplayName && content.body.includes(userDisplayName)) return true;
                            
                            // 3. @room mentions
                            if (content.body.includes('@room') || content.body.includes('@everyone')) return true;
                            
                            // 4. Check formatted body for mentions
                            if (content.formatted_body) {
                                if (content.formatted_body.includes(userId)) return true;
                                if (userDisplayName && content.formatted_body.includes(userDisplayName)) return true;
                            }
                            
                            // 5. Check for Matrix mentions in the event
                            if (content['m.mentions']) {
                                const mentions = content['m.mentions'];
                                if (mentions.user_ids && mentions.user_ids.includes(userId)) return true;
                                if (mentions.room) return true; // @room mention
                            }
                            
                            return false;
                        });

                        // Add mention events for this room
                        mentionEvents.forEach(event => {
                            mentionItems.push({
                                room,
                                event,
                                mentionCount
                            });
                        });
                    }
                }

                // Sort by most recent mention
                mentionItems.sort((a, b) => b.event.getTs() - a.event.getTs());

            setMentions(mentionItems);
            setLoading(false);
        } catch (error) {
            logger.error("Error loading mentions:", error);
            setLoading(false);
        }
    }, [client]);

    useEffect(() => {
        if (!client) return;

        // Load mentions initially
        loadMentions();

        // Listen for room updates
        const onRoomReceipt = () => loadMentions();
        const onRoomTimeline = () => loadMentions();

        client.on(RoomEvent.Receipt, onRoomReceipt);
        client.on(RoomEvent.Timeline, onRoomTimeline);

        return () => {
            client.off(RoomEvent.Receipt, onRoomReceipt);
            client.off(RoomEvent.Timeline, onRoomTimeline);
        };
    }, [client, loadMentions]);



    // Group mentions by room
    const mentionsByRoom = mentions.reduce((acc, mention) => {
        const roomId = mention.room.roomId;
        if (!acc[roomId]) {
            acc[roomId] = {
                room: mention.room,
                mentions: []
            };
        }
        acc[roomId].mentions.push(mention);
        return acc;
    }, {} as Record<string, { room: Room; mentions: MentionItem[] }>);

    const renderRoomSection = (roomData: { room: Room; mentions: MentionItem[] }): ReactElement => {
        const { room, mentions: roomMentions } = roomData;
        
        return (
            <div key={room.roomId} className="mx_MentionsView_roomSection">
                <div className="mx_MentionsView_roomHeader">
                    <RoomAvatar
                        room={room}
                        size="32px"
                        className="mx_MentionsView_roomAvatar"
                    />
                    <div className="mx_MentionsView_roomName" title={room.name || "Unnamed room"}>
                        <span className="mx_MentionsView_roomNameText">{room.name || "Unnamed room"}</span>
                    </div>
                </div>
                
                <div className="mx_MentionsView_messages">
                    {roomMentions.map((mentionItem) => {
                        const { event } = mentionItem;
                        const sender = room.getMember(event.getSender()!);
                        const timestamp = new Date(event.getTs()).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                        
                        return (
                            <div 
                                key={event.getId()} 
                                className="mx_MentionsView_message"
                            >
                                <div className="mx_MentionsView_messageHeader">
                                    {/* // send avatar */}
                                    <BaseAvatar
                                        url={sender?.getMxcAvatarUrl()}
                                        name={sender?.name}
                                        idName={sender?.userId}
                                        size="32px"
                                    />
                                    <div className="mx_MentionsView_senderInfo">
                                        <span className="mx_MentionsView_senderName">
                                            {sender?.name || event.getSender()}
                                        </span>
                                        <span className="mx_MentionsView_timestamp">
                                            {timestamp}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mx_MentionsView_messageContent">
                                    {event.getContent().body}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Single composer per room at the bottom */}
                    <ScopedRoomContextProvider
                        room={room}
                        roomId={room.roomId}
                        roomLoading={false}
                        peekLoading={false}
                        shouldPeek={false}
                        membersLoaded={true}
                        numUnreadMessages={0}
                        canPeek={false}
                        showApps={false}
                        isPeeking={false}
                        showRightPanel={false}
                        joining={false}
                        showTopUnreadMessagesBar={false}
                        statusBarVisible={false}
                        canReact={true}
                        canSelfRedact={true}
                        canSendMessages={room.maySendMessage()}
                        tombstone={room.currentState.getStateEvents("m.room.tombstone", "") || undefined}
                        resizing={false}
                        layout={Layout.Group}
                        lowBandwidth={false}
                        alwaysShowTimestamps={false}
                        showTwelveHourTimestamps={false}
                        userTimezone={undefined}
                        readMarkerInViewThresholdMs={3000}
                        readMarkerOutOfViewThresholdMs={30000}
                        showHiddenEvents={false}
                        showReadReceipts={true}
                        showRedactions={true}
                        showJoinLeaves={true}
                        showAvatarChanges={true}
                        showDisplaynameChanges={true}
                        matrixClientIsReady={true}
                        mainSplitContentType={MainSplitContentType.Timeline}
                        timelineRenderingType={TimelineRenderingType.Room}
                        liveTimeline={room.getLiveTimeline()}
                        narrow={false}
                        msc3946ProcessDynamicPredecessor={false}
                        isRoomEncrypted={null}
                        canAskToJoin={false}
                        promptAskToJoin={false}
                        viewRoomOpts={{ buttons: [] }}
                        showUrlPreview={true}
                        e2eStatus={undefined}
                        rejecting={false}
                        hasPinnedWidgets={false}
                        wasContextSwitch={false}
                        editState={undefined}
                    >
                        <MessageComposer
                            room={room}
                            resizeNotifier={resizeNotifier}
                            permalinkCreator={new RoomPermalinkCreator(room)}
                            e2eStatus={undefined}
                            compact={false}
                        />
                    </ScopedRoomContextProvider>

            </div>
        );
    };

    let content: ReactElement;

    if (loading) {
        content = (
            <div className="mx_MentionsView_loading">
                <Spinner />
                <p>Loading mentions...</p>
            </div>
        );
    } else if (mentions.length === 0) {
        content = (
            <div className="mx_MentionsView_empty">
                <div className="mx_MentionsView_emptyIcon" />
                <h3>No mentions</h3>
                <p>You're all caught up! No mentions to show.</p>
            </div>
        );
    } else {
        content = (
            <div className="mx_MentionsView_content">
                <div className="mx_MentionsView_list">
                    {Object.values(mentionsByRoom).map(renderRoomSection)}
                </div>
            </div>
        );
    }

    return (
        <div className="mx_MentionsView">
            <div className="mx_MentionsView_header">
                <div className="mx_MentionsView_headerContent">
                    <h1>Mentions {mentions.length > 0 && <span className="mx_MentionsView_count">{mentions.length}</span>}</h1>
                </div>
                {onClose && (
                    <AccessibleButton
                        className="mx_MentionsView_closeButton"
                        onClick={onClose}
                        title="Close mentions view"
                    >
                        ×
                    </AccessibleButton>
                )}
            </div>
            
            <main className="mx_MentionsView_body">
                {content}
            </main>


        </div>
    );
}
