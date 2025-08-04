/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import MeetView from "../views/features/MeetView";
import RoomFeatureView from "../views/features/RoomFeatureView";
import CalendarView from "../views/features/CalendarView";

export enum FeatureType {
    Meet = "meet",
    Room = "room",
    Calendar = "calendar",
}

interface IProps {
    featureType: FeatureType;
}

const FeatureContainer: React.FC<IProps> = ({ featureType }) => {
    switch (featureType) {
        case FeatureType.Meet:
            return <MeetView />;
        case FeatureType.Room:
            return <RoomFeatureView />;
        case FeatureType.Calendar:
            return <CalendarView />;
        default:
            return <div>Feature not found</div>;
    }
};

export default FeatureContainer;
