/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import AccessibleButton from "../elements/AccessibleButton";

interface IProps {}

const MeetView: React.FC<IProps> = () => {
    return (
        <div className="mx_MeetView">
            <div className="mx_MeetView_header">
                <h1>Meet</h1>
            </div>
            <div className="mx_MeetView_content">
                <div className="mx_MeetView_placeholder">
                    <div className="mx_MeetView_placeholderIcon" />
                    <h2>Video Meetings</h2>
                    <p>This feature is currently under development.</p>
                    <p>Soon you'll be able to schedule and join video meetings directly from Element.</p>
                    <AccessibleButton kind="primary" onClick={() => {}}>
                        Create Meeting
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
};

export default MeetView;
