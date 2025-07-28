/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { createContext, useContext, useState, type ReactNode } from "react";

interface RoomSearchContextValue {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

const RoomSearchContext = createContext<RoomSearchContextValue | null>(null);

interface RoomSearchProviderProps {
    children: ReactNode;
}

export function RoomSearchProvider({ children }: RoomSearchProviderProps): React.JSX.Element {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    return (
        <RoomSearchContext.Provider value={{ searchQuery, setSearchQuery, selectedDate, setSelectedDate }}>
            {children}
        </RoomSearchContext.Provider>
    );
}

export function useRoomSearch(): RoomSearchContextValue {
    const context = useContext(RoomSearchContext);
    if (!context) {
        throw new Error("useRoomSearch must be used within a RoomSearchProvider");
    }
    return context;
}
