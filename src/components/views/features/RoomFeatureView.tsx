/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import AccessibleButton from "../elements/AccessibleButton";

interface IProps {}

const RoomFeatureView: React.FC<IProps> = () => {
    return (
        <div className="mx_RoomFeatureView">
            <div className="mx_RoomFeatureView_header">
                <h1>Room</h1>
            </div>
            <div className="mx_RoomFeatureView_content">
                <div className="mx_RoomFeatureView_placeholder">
                    <div className="mx_RoomFeatureView_placeholderIcon" />
                    <h2>Enhanced Room Experience</h2>
                    <p>This feature is currently under development.</p>
                    <p>Soon you'll be able to access enhanced room features and management tools.</p>
                    <AccessibleButton kind="primary" onClick={() => {}}>
                        Create Room
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
};

export default RoomFeatureView;
