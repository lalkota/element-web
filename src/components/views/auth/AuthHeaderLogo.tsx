/*
Copyright 2019-2024 New Vector Ltd.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";

import SdkConfig from "../../../SdkConfig";

export enum AuthPageType {
    Login = "login",
    Register = "register",
    ForgotPassword = "forgot_password",
}

interface Props {
    pageType?: AuthPageType;
}

export default class AuthHeaderLogo extends React.PureComponent<Props> {
    private getLogoForPageType(pageType: AuthPageType): string {
        const logoMap = {
            [AuthPageType.Login]: "themes/element/img/login/login.svg",
            [AuthPageType.Register]: "themes/element/img/register/register.svg",
            [AuthPageType.ForgotPassword]: "themes/element/img/forgot-password/set-new-password.svg",
        };
        return logoMap[pageType] || logoMap[AuthPageType.Login];
    }

    private getAltTextForPageType(pageType: AuthPageType): string {
        const altTextMap = {
            [AuthPageType.Login]: "Welcome back to Meetex",
            [AuthPageType.Register]: "Join Meetex today",
            [AuthPageType.ForgotPassword]: "Reset your Meetex password",
        };
        return altTextMap[pageType] || "Meetex Logo";
    }

    public render(): React.ReactElement {
        const { pageType = AuthPageType.Login } = this.props;
        const brandingConfig = SdkConfig.getObject("branding");
        
        // Use custom logo based on page type, fall back to branding config only if no pageType
        const logoUrl = this.props.pageType ? this.getLogoForPageType(pageType) : 
            (brandingConfig?.get("auth_header_logo_url") ?? this.getLogoForPageType(pageType));
        const altText = this.getAltTextForPageType(pageType);

        return (
            <aside className="mx_AuthHeaderLogo">
                <img src={logoUrl} alt={altText} />
            </aside>
        );
    }
}
