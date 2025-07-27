/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useContext, useEffect, useState, type JSX } from "react";
import { Room, NotificationCountType, RoomEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../languageHandler";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import BaseCard from "../views/right_panel/BaseCard";
import Spinner from "../views/elements/Spinner";
import AccessibleButton from "../views/elements/AccessibleButton";

interface IProps {
    onClose(): void;
}

interface MentionItem {
    room: Room;
    mentionCount: number;
}

/**
 * Component which shows all mentions across rooms in a dedicated panel
 */
export default function MentionsPanel({ onClose }: IProps): JSX.Element {
    const client = useContext(MatrixClientContext);
    const [mentions, setMentions] = useState<MentionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!client) return;

        const updateMentions = () => {
            try {
                const rooms = client.getVisibleRooms();
                const mentionItems: MentionItem[] = [];

                rooms.forEach(room => {
                    const mentionCount = room.getUnreadNotificationCount(NotificationCountType.Highlight);
                    if (mentionCount > 0) {
                        mentionItems.push({
                            room,
                            mentionCount
                        });
                    }
                });

                // Sort by most recent activity
                mentionItems.sort((a, b) => {
                    const aTime = a.room.getLastActiveTimestamp();
                    const bTime = b.room.getLastActiveTimestamp();
                    return bTime - aTime;
                });

                setMentions(mentionItems);
                setLoading(false);
            } catch (error) {
                logger.error("Error loading mentions:", error);
                setLoading(false);
            }
        };

        updateMentions();

        // Listen for room updates (simplified)
        const onRoomReceipt = () => updateMentions();
        client.on(RoomEvent.Receipt, onRoomReceipt);

        return () => {
            client.off(RoomEvent.Receipt, onRoomReceipt);
        };
    }, [client]);

    const onRoomClick = (room: Room) => {
        // Navigate to the room
        window.location.hash = `#/room/${room.roomId}`;
        onClose();
    };

    let content: JSX.Element;

    if (loading) {
        content = <Spinner />;
    } else if (mentions.length === 0) {
        content = (
            <div className="mx_MentionsPanel_empty">
                <div className="mx_MentionsPanel_emptyIcon" />
                <h3>No mentions</h3>
                <p>You're all caught up! No mentions to show.</p>
            </div>
        );
    } else {
        content = (
            <div className="mx_MentionsPanel_list">
                {mentions.map(({ room, mentionCount }) => (
                    <div key={room.roomId} className="mx_MentionsPanel_item">
                        <AccessibleButton
                            className="mx_MentionsPanel_roomButton"
                            onClick={() => onRoomClick(room)}
                        >
                            <div className="mx_MentionsPanel_roomInfo">
                                <div className="mx_MentionsPanel_roomDetails">
                                    <div className="mx_MentionsPanel_roomName">
                                        {room.name || "Unnamed room"}
                                    </div>
                                    <div className="mx_MentionsPanel_mentionCount">
                                        {mentionCount} {mentionCount === 1 ? "mention" : "mentions"}
                                    </div>
                                </div>
                            </div>
                        </AccessibleButton>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <BaseCard
            header={
                <div className="mx_MentionsPanel_header">
                    <h2>Mentions</h2>
                </div>
            }
            className="mx_MentionsPanel"
            onClose={onClose}
            withoutScrollContainer
        >
            {content}
        </BaseCard>
    );
}
