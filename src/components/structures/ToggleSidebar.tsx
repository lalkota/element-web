/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, type JSX } from "react";
import classNames from "classnames";
import { _t } from "../../languageHandler";
import AccessibleButton from "../views/elements/AccessibleButton";
import dis from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../stores/room-list/RoomListStore";
import { DefaultTagID } from "../../stores/room-list/models";
import { Room, UserEvent } from "matrix-js-sdk/src/matrix";
import RoomAvatar from "../views/avatars/RoomAvatar";
import { UserTab } from "../views/dialogs/UserTab";
import { type OpenToTabPayload } from "../../dispatcher/payloads/OpenToTabPayload";
import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";
import { findHighContrastTheme, isHighContrastTheme } from "../../theme";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { OwnProfileStore } from "../../stores/OwnProfileStore";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import BaseAvatar from "../views/avatars/BaseAvatar";
import UserIdentifierCustomisations from "../../customisations/UserIdentifier";
import WithPresenceIndicator from "../views/avatars/WithPresenceIndicator";


interface IProps {
    isCollapsed: boolean;
    onToggle: (collapsed: boolean) => void;
}

interface ISidebarItem {
    id: string;
    icon: string;
    label: string;
    count?: number;
    active?: boolean;
    onClick?: () => void;
    room?: Room; // For rendering avatars
}

interface ISidebarSection {
    title: string;
    items: ISidebarItem[];
    collapsible?: boolean;
    collapsed?: boolean;
}

export default function ToggleSidebar({ isCollapsed, onToggle }: IProps): JSX.Element {
    const [activeItem, setActiveItem] = useState<string>("chats");
    const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
    const [rooms, setRooms] = useState<Room[]>([]);
    const [directMessages, setDirectMessages] = useState<Room[]>([]);
    const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
    const [userDisplayName, setUserDisplayName] = useState<string>("");
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState<string>("");
    const [userPresence, setUserPresence] = useState<string>("offline");

    const handleToggle = (): void => {
        onToggle(!isCollapsed);
    };

    const onSettingsClick = (): void => {
        const payload: OpenToTabPayload = { action: Action.ViewUserSettings, initialTabId: undefined };
        dis.dispatch(payload);
    };

    const onNotificationsClick = (): void => {
        const payload: OpenToTabPayload = { action: Action.ViewUserSettings, initialTabId: UserTab.Notifications };
        dis.dispatch(payload);
    };

    const onThemeToggleClick = (theme: "light" | "dark"): void => {
        // Disable system theme matching if the user hits this button
        SettingsStore.setValue("use_system_theme", null, SettingLevel.DEVICE, false);

        let newTheme: string = theme;
        // Check if user is on high contrast and maintain it
        if (isHighContrastTheme(SettingsStore.getValue("theme"))) {
            const hcTheme = findHighContrastTheme(newTheme);
            if (hcTheme) {
                newTheme = hcTheme;
            }
        }
        SettingsStore.setValue("theme", null, SettingLevel.DEVICE, newTheme);
        setCurrentTheme(theme);
    };

    const toggleSection = (sectionId: string): void => {
        setSectionsCollapsed(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Load rooms from RoomListStore
    useEffect(() => {
        const updateRooms = () => {
            const orderedLists = RoomListStore.instance.orderedLists;
            
            // Get regular rooms (not DMs)
            const regularRooms = [
                ...(orderedLists[DefaultTagID.Favourite] || []),
                ...(orderedLists[DefaultTagID.Untagged] || []),
                ...(orderedLists[DefaultTagID.LowPriority] || [])
            ];
            
            // Get direct messages
            const dmRooms = orderedLists[DefaultTagID.DM] || [];
            
            setRooms(regularRooms.slice(0, 10)); // Limit to first 10 rooms
            setDirectMessages(dmRooms.slice(0, 10)); // Limit to first 10 DMs
        };

        // Initial load
        updateRooms();

        // Listen for room list updates
        RoomListStore.instance.on(LISTS_UPDATE_EVENT, updateRooms);

        // Listen for room receipt events to update unread counts
        const onRoomReceipt = (event: MatrixEvent, room: Room) => {
            // Check if this receipt is for the current user
            const myUserId = MatrixClientPeg.get().getUserId();
            const content = event.getContent();
            const receiptType = Object.keys(content)[0];
            
            // Only update if this is a read receipt
            if (receiptType === "m.read" || receiptType === "m.read.private") {
                const userIds = Object.keys(content[receiptType]);
                
                // If this receipt is for the current user, update the rooms
                if (userIds.includes(myUserId)) {
                    updateRooms();
                }
            }
        };

        const client = MatrixClientPeg.get();
        client.on("Room.receipt", onRoomReceipt);

        return () => {
            RoomListStore.instance.off(LISTS_UPDATE_EVENT, updateRooms);
            client.removeListener("Room.receipt", onRoomReceipt);
        };
    }, []);

    // Sync theme state with actual theme setting
    useEffect(() => {
        const updateTheme = () => {
            const theme = SettingsStore.getValue("theme");
            // Extract base theme (light/dark) from potential high contrast themes
            if (theme.includes("dark")) {
                setCurrentTheme("dark");
            } else {
                setCurrentTheme("light");
            }
        };

        // Initial sync
        updateTheme();

        // Listen for theme changes
        const watcherRef = SettingsStore.watchSetting("theme", null, updateTheme);

        return () => {
            if (watcherRef) {
                SettingsStore.unwatchSetting(watcherRef);
            }
        };
    }, []);

    // Load and update user profile information
    useEffect(() => {
        const updateUserProfile = () => {
            const client = MatrixClientPeg.safeGet();
            const currentUserId = client.getSafeUserId();
            const displayName = OwnProfileStore.instance.displayName || currentUserId;
            const avatarUrl = OwnProfileStore.instance.getHttpAvatarUrl(32);
            
            // Get user presence
            const user = client.getUser(currentUserId);
            const presence = user?.presence || "offline";
            
            setUserId(currentUserId);
            setUserDisplayName(displayName);
            setUserAvatarUrl(avatarUrl);
            setUserPresence(presence);
        };

        // Initial load
        updateUserProfile();

        // Listen for profile updates
        OwnProfileStore.instance.on(UPDATE_EVENT, updateUserProfile);

        // Listen for presence updates
        const client = MatrixClientPeg.safeGet();
        const user = client.getUser(client.getSafeUserId());
        const onPresenceUpdate = () => {
            if (user) {
                setUserPresence(user.presence || "offline");
            }
        };
        
        if (user) {
            user.on(UserEvent.Presence, onPresenceUpdate);
            user.on(UserEvent.CurrentlyActive, onPresenceUpdate);
        }

        return () => {
            OwnProfileStore.instance.off(UPDATE_EVENT, updateUserProfile);
            if (user) {
                user.off(UserEvent.Presence, onPresenceUpdate);
                user.off(UserEvent.CurrentlyActive, onPresenceUpdate);
            }
        };
    }, []);

    const sidebarSections: ISidebarSection[] = [
        {
            title: "",
            items: [
                {
                    id: "home",
                    icon: "home",
                    label: "Home",
                    onClick: () => {
                        setActiveItem("home");
                        dis.dispatch({ action: Action.ViewHomePage });
                    },
                },
                {
                    id: "chats",
                    icon: "chats",
                    label: "Chats",
                    active: activeItem === "chats",
                    onClick: () => {
                        setActiveItem("chats");
                        // Dispatch action to handle chat navigation
                        dis.dispatch({ action: "view_chats" });
                    },
                },
                {
                    id: "meet",
                    icon: "meet",
                    label: "Meet",
                    onClick: () => {
                        setActiveItem("meet");
                        // Use URL-based navigation
                        dis.dispatch({
                            action: "view_meet"
                        });
                        // Also dispatch the feature view action for backward compatibility
                        dis.dispatch({
                            action: "show_feature_view",
                            featureType: "meet"
                        });
                    },
                },
                {
                    id: "room",
                    icon: "room",
                    label: "Room",
                    onClick: () => {
                        setActiveItem("room");
                        // Use URL-based navigation
                        dis.dispatch({
                            action: "view_room_feature"
                        });
                        // Also dispatch the feature view action for backward compatibility
                        dis.dispatch({
                            action: "show_feature_view",
                            featureType: "room"
                        });
                    },
                },
                {
                    id: "calendar",
                    icon: "calendar",
                    label: "Calendar",
                    onClick: () => {
                        setActiveItem("calendar");
                        // Use URL-based navigation
                        dis.dispatch({
                            action: "view_calendar"
                        });
                        // Also dispatch the feature view action for backward compatibility
                        dis.dispatch({
                            action: "show_feature_view",
                            featureType: "calendar"
                        });
                    },
                },
            ],
        },
        {
            title: "Direct Messages",
            collapsible: true,
            collapsed: sectionsCollapsed["directmessages"],
            items: directMessages.map(room => ({
                id: room.roomId,
                icon: "user",
                label: room.name || "Unknown DM",
                count: room.getUnreadNotificationCount() || undefined,
                room: room, // Include room for avatar
                onClick: () => {
                    setActiveItem(room.roomId);
                    dis.dispatch({
                        action: Action.ViewRoom,
                        room_id: room.roomId,
                    });
                },
            })),
        },
        {
            title: "Rooms",
            collapsible: true,
            collapsed: sectionsCollapsed["rooms"],
            items: [
                ...rooms.map(room => ({
                    id: room.roomId,
                    icon: "room",
                    label: room.name || "Unknown Room",
                    count: room.getUnreadNotificationCount() || undefined,
                    room: room, // Include room for avatar
                    onClick: () => {
                        setActiveItem(room.roomId);
                        dis.dispatch({
                            action: Action.ViewRoom,
                            room_id: room.roomId,
                        });
                    },
                })),
                {
                    id: "create-room",
                    icon: "plus",
                    label: "Create Room",
                    onClick: () => {
                        setActiveItem("create-room");
                        dis.dispatch({ action: Action.CreateRoom });
                    },
                },
            ],
        },
    ];

    const renderSection = (section: ISidebarSection, sectionIndex: number) => {
        const sectionId = section.title.toLowerCase().replace(" ", "");
        const isCollapsed = section.collapsed || sectionsCollapsed[sectionId];
        
        return (
            <div key={sectionIndex} className="mx_ToggleSidebar_section">
                {section.collapsible && (
                    <AccessibleButton
                        className="mx_ToggleSidebar_sectionHeader"
                        onClick={() => toggleSection(sectionId)}
                    >
                        <div className={classNames("mx_ToggleSidebar_sectionChevron", {
                            "mx_ToggleSidebar_sectionChevron--collapsed": isCollapsed
                        })} />
                        <span className="mx_ToggleSidebar_sectionTitle">{section.title}</span>
                    </AccessibleButton>
                )}
                
                {!isCollapsed && (
                    <ul className="mx_ToggleSidebar_sectionList">
                        {section.items.map((item) => (
                            <li key={item.id} className="mx_ToggleSidebar_sectionItem">
                                <AccessibleButton
                                    className={classNames("mx_ToggleSidebar_sectionButton", {
                                        "mx_ToggleSidebar_sectionButton--active": item.active || activeItem === item.id,
                                        [`mx_ToggleSidebar_sectionButton--active-${item.id}`]: item.active || activeItem === item.id,
                                    })}
                                    onClick={item.onClick || (() => {})}
                                >
                                    {item.room ? (
                                        <WithPresenceIndicator room={item.room} size="8px">
                                            <RoomAvatar 
                                                room={item.room} 
                                                size="32px" 
                                                className="mx_ToggleSidebar_roomAvatar"
                                            />
                                        </WithPresenceIndicator>
                                    ) : (
                                        <div className={`mx_ToggleSidebar_sectionIcon mx_ToggleSidebar_sectionIcon--${item.icon}`} />
                                    )}
                                    <span className="mx_ToggleSidebar_sectionLabel">{item.label}</span>
                                    {item.count && item.count > 0 && (
                                        <span className="mx_ToggleSidebar_count">{item.count}</span>
                                    )}
                                </AccessibleButton>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <div className={classNames("mx_ToggleSidebar", { "mx_ToggleSidebar--collapsed": isCollapsed })}>
            <div className="mx_ToggleSidebar_header">
                <div className="mx_ToggleSidebar_logo">
                    <div className="mx_ToggleSidebar_logoIcon" />
                </div>
                <AccessibleButton
                    className="mx_ToggleSidebar_toggleButton"
                    onClick={handleToggle}
                    title={isCollapsed ? _t("action|expand") : _t("action|collapse")}
                >
                    <div className="mx_ToggleSidebar_toggleIcon" />
                </AccessibleButton>
            </div>

            <div className="mx_ToggleSidebar_content">
                {sidebarSections.map(renderSection)}
            </div>

            <div className="mx_ToggleSidebar_footer">
                <AccessibleButton 
                    className="mx_ToggleSidebar_notifications"
                    onClick={onNotificationsClick}
                    title="Open Notifications Settings"
                >
                    <div className="mx_ToggleSidebar_notificationIcon" />
                    <span className="mx_ToggleSidebar_notificationLabel">Notifications</span>
                </AccessibleButton>
                <AccessibleButton 
                    className="mx_ToggleSidebar_settings"
                    onClick={onSettingsClick}
                    title="Open Settings"
                >
                    <div className="mx_ToggleSidebar_settingsIcon" />
                    <span className="mx_ToggleSidebar_settingsLabel">Settings</span>
                </AccessibleButton>
                <div className="mx_ToggleSidebar_user">
                    <div className="mx_ToggleSidebar_userAvatarContainer">
                        <BaseAvatar
                            idName={userId}
                            name={userDisplayName}
                            url={userAvatarUrl}
                            size="32px"
                            className="mx_ToggleSidebar_userAvatar"
                        />
                        <div className={`mx_ToggleSidebar_presenceIndicator mx_ToggleSidebar_presenceIndicator--${userPresence}`} />
                    </div>
                    <div className="mx_ToggleSidebar_userInfo">
                        <span className="mx_ToggleSidebar_userName">{userDisplayName}</span>
                        <span className="mx_ToggleSidebar_userEmail">
                            {UserIdentifierCustomisations.getDisplayUserIdentifier(userId, { withDisplayName: false }) || userId}
                        </span>
                    </div>
                </div>
                <div className="mx_ToggleSidebar_themeToggle">
                    <AccessibleButton
                        className={classNames("mx_ToggleSidebar_themeButton", {
                            "mx_ToggleSidebar_themeButton--active": currentTheme === "light"
                        })}
                        onClick={() => onThemeToggleClick("light")}
                    >
                        <div className="mx_ToggleSidebar_themeIcon mx_ToggleSidebar_themeIcon--light" />
                        <span className="mx_ToggleSidebar_themeLabel">Light</span>
                    </AccessibleButton>
                    <AccessibleButton
                        className={classNames("mx_ToggleSidebar_themeButton", {
                            "mx_ToggleSidebar_themeButton--active": currentTheme === "dark"
                        })}
                        onClick={() => onThemeToggleClick("dark")}
                    >
                        <div className="mx_ToggleSidebar_themeIcon mx_ToggleSidebar_themeIcon--dark" />
                        <span className="mx_ToggleSidebar_themeLabel">Dark</span>
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
}
