/*
Copyright 2019-2024 New Vector Ltd.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";

import AuthHeaderLogo, { AuthPageType } from "./AuthHeaderLogo";
import LanguageSelector from "./LanguageSelector";

interface IProps {
    disableLanguageSelector?: boolean;
    pageType?: AuthPageType;
}

export default class AuthHeader extends React.Component<IProps> {
    public render(): React.ReactNode {
        return (
            <div className="mx_AuthHeader">
                <AuthHeaderLogo pageType={this.props.pageType} />
                {/* <LanguageSelector disabled={this.props.disableLanguageSelector} /> */}
            </div>
        );
    }
}
