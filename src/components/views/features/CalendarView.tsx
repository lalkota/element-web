/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import AccessibleButton from "../elements/AccessibleButton";

interface IProps {}

const CalendarView: React.FC<IProps> = () => {
    return (
        <div className="mx_CalendarView">
            <div className="mx_CalendarView_header">
                <h1>Calendar</h1>
            </div>
            <div className="mx_CalendarView_content">
                <div className="mx_CalendarView_placeholder">
                    <div className="mx_CalendarView_placeholderIcon" />
                    <h2>Event Scheduling</h2>
                    <p>This feature is currently under development.</p>
                    <p>Soon you'll be able to schedule and manage events directly from Element.</p>
                    <AccessibleButton kind="primary" onClick={() => {}}>
                        Create Event
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
