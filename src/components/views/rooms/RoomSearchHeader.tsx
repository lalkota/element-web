/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Room } from "matrix-js-sdk/src/matrix";

import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import SearchBox from "../../structures/SearchBox";
import CalendarIcon from "@vector-im/compound-design-tokens/assets/web/icons/calendar";

interface RoomSearchHeaderProps {
    room: Room;
    showDateFilter?: boolean;
}

export default function RoomSearchHeader({ room, showDateFilter = true }: RoomSearchHeaderProps): JSX.Element {
    const { searchQuery, setSearchQuery, selectedDate, setSelectedDate } = useRoomSearch();

    return (
        <div className="mx_RoomSearchHeader">
            <div className="mx_RoomSearchHeader_search">
                <SearchBox
                    className="mx_RoomSearchHeader_searchBox"
                    placeholder="Search"
                    onSearch={setSearchQuery}
                    initialValue={searchQuery}
                />
            </div>
            {showDateFilter && (
                <div className="mx_RoomSearchHeader_dateFilter">
                    <CalendarIcon width="16" height="16" className="mx_RoomSearchHeader_dateIcon" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="mx_RoomSearchHeader_dateInput"
                        placeholder="Filter by date"
                    />
                </div>
            )}
        </div>
    );
}
