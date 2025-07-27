/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useContext, useEffect } from "react";
import { NotificationCountType, RoomEvent } from "matrix-js-sdk/src/matrix";
import AccessibleButton from "../../elements/AccessibleButton";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { useUnreadThreadRooms } from "../../spaces/threads-activity-centre/useUnreadThreadRooms";
import { StatelessNotificationBadge } from "../NotificationBadge/StatelessNotificationBadge";
import dis from "../../../../dispatcher/dispatcher";

interface MentionsAndThreadsProps {
    // No props needed for now
}

/**
 * Component that displays Mentions and Threads sections at the top of the room list
 */
export const MentionsAndThreads: React.FC<MentionsAndThreadsProps> = () => {
    const client = useContext(MatrixClientContext);
    const [mentionsCount, setMentionsCount] = useState(0);
    
    // Calculate unread mentions count across all rooms
    useEffect(() => {
        if (!client) return;
        
        const updateMentionsCount = () => {
            try {
                const rooms = client.getVisibleRooms();
                const totalMentions = rooms.reduce((total, room) => {
                    const count = room.getUnreadNotificationCount(NotificationCountType.Highlight);
                    return total + count;
                }, 0);
                console.log('Mentions count updated:', totalMentions); // Debug log
                setMentionsCount(totalMentions);
            } catch (error) {
                console.error('Error updating mentions count:', error);
            }
        };
        
        updateMentionsCount();
        
        // Listen to multiple events for real-time updates
        const onRoomReceipt = () => {
            console.log('Room receipt event, updating mentions count');
            updateMentionsCount();
        };
        const onRoomTimeline = () => {
            console.log('Room timeline event, updating mentions count');
            updateMentionsCount();
        };
        const onAccountData = () => {
            console.log('Account data event, updating mentions count');
            updateMentionsCount();
        };
        
        client.on(RoomEvent.Receipt, onRoomReceipt);
        client.on(RoomEvent.Timeline, onRoomTimeline);
        client.on(RoomEvent.AccountData, onAccountData);
        
        return () => {
            client.off(RoomEvent.Receipt, onRoomReceipt);
            client.off(RoomEvent.Timeline, onRoomTimeline);
            client.off(RoomEvent.AccountData, onAccountData);
        };
    }, [client]);
    
    // Get unread threads data
    const threadsData = useUnreadThreadRooms(true);
    const threadsCount = threadsData.rooms.length;

    const onMentionsClick = () => {
        // Dispatch action to show mentions view
        dis.dispatch({ action: "show_mentions_view" });
    };

    const onThreadsClick = () => {
        // Open the threads activity centre or threads panel
        RightPanelStore.instance.setCard({ phase: RightPanelPhases.ThreadPanel }, true);
    };

    return (
        <div className="mx_MentionsAndThreads">
            {/* Mentions Section */}
            <AccessibleButton
                className="mx_MentionsAndThreads_item mx_MentionsAndThreads_mentions"
                onClick={onMentionsClick}

            >
                <div className="mx_MentionsAndThreads_icon mx_MentionsAndThreads_mentionsIcon" />
                <span className="mx_MentionsAndThreads_label">Mentions</span>
                {mentionsCount > 0 && (
                    <StatelessNotificationBadge
                            level={NotificationLevel.Highlight}
                            count={mentionsCount}
                            symbol={null}
                            forceDot={false}
                    />
                )}
            </AccessibleButton>

            {/* Threads Section */}
            <AccessibleButton
                className="mx_MentionsAndThreads_item mx_MentionsAndThreads_threads"
                onClick={onThreadsClick}
            >
                <div className="mx_MentionsAndThreads_icon mx_MentionsAndThreads_threadsIcon" />
                <span className="mx_MentionsAndThreads_label">Threads</span>
                {threadsCount > 0 && (
                    <StatelessNotificationBadge
                            level={NotificationLevel.Notification}
                            count={threadsCount}
                            symbol={null}
                            forceDot={false}
                    />
                )}
            </AccessibleButton>
        </div>
    );
};


