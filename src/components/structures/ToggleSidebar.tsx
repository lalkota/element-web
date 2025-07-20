/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState } from "react";
import classNames from "classnames";
import { _t } from "../../languageHandler";
import AccessibleButton from "../views/elements/AccessibleButton";
import dis from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";

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

    const handleToggle = (): void => {
        onToggle(!isCollapsed);
    };

    const toggleSection = (sectionId: string): void => {
        setSectionsCollapsed(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

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
            title: "Chat list",
            collapsible: true,
            collapsed: sectionsCollapsed["chatlist"],
            items: [
                {
                    id: "phoenix",
                    icon: "user",
                    label: "Phoenix Baker",
                    count: 1,
                    onClick: () => setActiveItem("phoenix"),
                },
                {
                    id: "katherine",
                    icon: "user",
                    label: "Katherine Moss",
                    count: 4,
                    onClick: () => setActiveItem("katherine"),
                },
                {
                    id: "group",
                    icon: "group",
                    label: "Group Name",
                    count: 16,
                    onClick: () => setActiveItem("group"),
                },
            ],
        },
        {
            title: "Rooms",
            collapsible: true,
            collapsed: sectionsCollapsed["rooms"],
            items: [
                {
                    id: "roomname",
                    icon: "room",
                    label: "Room Name",
                    count: 4,
                    onClick: () => setActiveItem("roomname"),
                },
                {
                    id: "newlist",
                    icon: "plus",
                    label: "New list",
                    onClick: () => setActiveItem("newlist"),
                },
            ],
        },
    ];

    const renderSection = (section: ISidebarSection, sectionIndex: number) => {
        const sectionId = section.title.toLowerCase().replace(" ", "");
        const isCollapsed = section.collapsed || sectionsCollapsed[sectionId];
        
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
                                    <div className={`mx_ToggleSidebar_sectionIcon mx_ToggleSidebar_sectionIcon--${item.icon}`} />
                                    <span className="mx_ToggleSidebar_sectionLabel">{item.label}</span>
                                    {item.count && (
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
                    <span className="mx_ToggleSidebar_logoText">MEET</span>
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
                <div className="mx_ToggleSidebar_theme">
                    <div className="mx_ToggleSidebar_themeIcon" />
                    <span className="mx_ToggleSidebar_themeLabel">Light</span>
                    <div className="mx_ToggleSidebar_themeDark">
                        <span>Dark</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
