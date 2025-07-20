/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect } from "react";
import classNames from "classnames";
import { _t } from "../../languageHandler";
import AccessibleButton from "../views/elements/AccessibleButton";
import dis from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../stores/room-list/RoomListStore";
import { DefaultTagID } from "../../stores/room-list/models";
import { Room } from "matrix-js-sdk/src/matrix";
import RoomAvatar from "../views/avatars/RoomAvatar";

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

    const handleToggle = (): void => {
        onToggle(!isCollapsed);
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

        return () => {
            RoomListStore.instance.off(LISTS_UPDATE_EVENT, updateRooms);
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
                    },
                },
                {
                    id: "meet",
                    icon: "meet",
                    label: "Meet",
                    onClick: () => {
                        setActiveItem("meet");
                    },
                },
                {
                    id: "room",
                    icon: "room",
                    label: "Room",
                    onClick: () => {
                        setActiveItem("room");
                    },
                },
                {
                    id: "calendar",
                    icon: "calendar",
                    label: "Calendar",
                    onClick: () => {
                        setActiveItem("calendar");
                    },
                },
            ],
        },
        {
            title: "Direct Messages",
            collapsible: true,
            items: [
                ...directMessages.map((room) => ({
                    id: room.roomId,
                    icon: "dm",
                    label: room.name || "Unknown Room",
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
                    id: "create-dm",
                    icon: "plus",
                    label: "Start new chat",
                    onClick: () => {
                        setActiveItem("create-dm");
                    },
                },
            ],
        },
        {
            title: "Rooms",
            collapsible: true,
            items: [
                ...rooms.map((room) => ({
                    id: room.roomId,
                    icon: "room",
                    label: room.name || "Unknown Room",
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
                    },
                },
            ],
        },
    ];

    const renderSection = (section: ISidebarSection, sectionIndex: number): JSX.Element => {
        const sectionId = `section-${sectionIndex}`;
        const isCollapsed = sectionsCollapsed[sectionId] || false;

        return (
            <div key={sectionIndex} className="mx_ToggleSidebar_section">
                {section.collapsible ? (
                    <AccessibleButton
                        className="mx_ToggleSidebar_sectionHeader"
                        onClick={() => toggleSection(sectionId)}
                    >
                        <div className={classNames("mx_ToggleSidebar_sectionChevron", {
                            "mx_ToggleSidebar_sectionChevron--collapsed": isCollapsed
                        })} />
                        <span className="mx_ToggleSidebar_sectionTitle">{section.title}</span>
                    </AccessibleButton>
                ) : (
                    <div className="mx_ToggleSidebar_sectionHeader">
                        <span className="mx_ToggleSidebar_sectionTitle">{section.title}</span>
                    </div>
                )}
                {(!section.collapsible || !isCollapsed) && (
                    <ul className="mx_ToggleSidebar_sectionList">
                        {section.items.map((item) => (
                            <li key={item.id} className="mx_ToggleSidebar_sectionItem">
                                <AccessibleButton
                                    className={classNames("mx_ToggleSidebar_sectionButton", {
                                        [`mx_ToggleSidebar_sectionButton--${item.id}`]: item.active,
                                    })}
                                    onClick={item.onClick}
                                >
                                    {item.room ? (
                                        <RoomAvatar 
                                            room={item.room} 
                                            size="24px" 
                                            className="mx_ToggleSidebar_roomAvatar"
                                        />
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
                <div className="mx_ToggleSidebar_notifications">
                    <div className="mx_ToggleSidebar_notificationIcon" />
                    <span className="mx_ToggleSidebar_notificationLabel">Notifications</span>
                </div>
                <div className="mx_ToggleSidebar_settings">
                    <div className="mx_ToggleSidebar_settingsIcon" />
                    <span className="mx_ToggleSidebar_settingsLabel">Settings</span>
                </div>
                <div className="mx_ToggleSidebar_user">
                    <div className="mx_ToggleSidebar_userAvatar" />
                    <div className="mx_ToggleSidebar_userInfo">
                        <span className="mx_ToggleSidebar_userName">Yousef Qamar</span>
                        <span className="mx_ToggleSidebar_userEmail">yousef.qamar@cyberx.com</span>
                    </div>
                </div>
                <div className="mx_ToggleSidebar_themeToggle">
                    <AccessibleButton
                        className={classNames("mx_ToggleSidebar_themeButton", {
                            "mx_ToggleSidebar_themeButton--active": currentTheme === "light"
                        })}
                        onClick={() => setCurrentTheme("light")}
                    >
                        <div className="mx_ToggleSidebar_themeIcon mx_ToggleSidebar_themeIcon--light" />
                        <span className="mx_ToggleSidebar_themeLabel">Light</span>
                    </AccessibleButton>
                    <AccessibleButton
                        className={classNames("mx_ToggleSidebar_themeButton", {
                            "mx_ToggleSidebar_themeButton--active": currentTheme === "dark"
                        })}
                        onClick={() => setCurrentTheme("dark")}
                    >
                        <div className="mx_ToggleSidebar_themeIcon mx_ToggleSidebar_themeIcon--dark" />
                        <span className="mx_ToggleSidebar_themeLabel">Dark</span>
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
}
