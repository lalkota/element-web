/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

interface AttachmentIconProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

export default function AttachmentIcon({ width = 24, height = 24, className }: AttachmentIconProps): JSX.Element {
    return (
        <svg width={width}
            height={height} viewBox="0 0 24 24"
            className={className}
            xmlns="http://www.w3.org/2000/svg">
            <path d="M18.3332 9.16699V14.167C18.3332 17.5003 17.4998 18.3337 14.1665 18.3337H5.83317C2.49984 18.3337 1.6665 17.5003 1.6665 14.167V5.83366C1.6665 2.50033 2.49984 1.66699 5.83317 1.66699H7.08317C8.33317 1.66699 8.60817 2.03366 9.08317 2.66699L10.3332 4.33366C10.6498 4.75033 10.8332 5.00033 11.6665 5.00033H14.1665C17.4998 5.00033 18.3332 5.83366 18.3332 9.16699Z" stroke-opacity="0.5" stroke-width="1.25" stroke-miterlimit="10"/>
        </svg>
    );
}
