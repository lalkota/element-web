/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useRef } from "react";
import { Room } from "matrix-js-sdk/src/matrix";
import { _t } from "../../../languageHandler";
import SearchBox from "../../structures/SearchBox";
import UserMenu from "../../structures/UserMenu";
import { Action } from "../../../dispatcher/actions";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { RoomListStore } from "../../../stores/room-list/RoomListStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";

interface IProps {
    isPanelCollapsed: boolean;
    onSearch: (query: string) => void;
    onCleared?: () => void;
}

export default function Header({ isPanelCollapsed, onSearch, onCleared }: IProps): JSX.Element {
    const [searchQuery, setSearchQuery] = useState("");
    const searchRef = useRef<HTMLDivElement>(null);

    // Handle room list updates to refresh search if needed
    useEventEmitter(RoomListStore.instance, UPDATE_EVENT, () => {
        if (searchQuery) {
            onSearch(searchQuery);
        }
    });

    const handleSearch = (query: string): void => {
        setSearchQuery(query);
        onSearch(query);
    };

    const handleCleared = (): void => {
        setSearchQuery("");
        onCleared?.();
    };

    return (
        <div className="mx_Header">
            <div className="mx_Header_container">
                <div className="mx_Header_search" ref={searchRef}>
                    <SearchBox
                        placeholder={_t("Search")}
                        onSearch={handleSearch}
                        onCleared={handleCleared}
                        autoFocus={false}
                        className="mx_Header_searchBox"
                    />
                </div>
                <div className="mx_Header_userMenu">
                    <UserMenu isPanelCollapsed={isPanelCollapsed} />
                </div>
            </div>
        </div>
    );
}
