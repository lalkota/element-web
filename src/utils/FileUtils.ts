/*
Copyright 2024 New Vector Ltd.
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>
Copyright 2015-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    filesize,
    type FileSizeOptionsArray,
    type FileSizeOptionsBase,
    type FileSizeOptionsExponent,
    type FileSizeOptionsObject,
    type FileSizeOptionsString,
    type FileSizeReturnArray,
    type FileSizeReturnObject,
} from "filesize";
import { type MediaEventContent } from "matrix-js-sdk/src/types";

import { _t } from "../languageHandler";

export function downloadLabelForFile(content: MediaEventContent, withSize = true): string {
    let text = _t("action|download");

    if (content.info?.size && withSize) {
        // If we know the size of the file then add it as human-readable string to the end of the link text
        // so that the user knows how big a file they are downloading.
        text += " (" + <string>fileSize(content.info.size, { base: 2, standard: "jedec" }) + ")";
    }
    return text;
}

/**
 * Extracts a human-readable label for the file attachment to use as
 * link text.
 *
 * @param {MediaEventContent} content The "content" key of the matrix event.
 * @param {string} fallbackText The fallback text
 * @param {boolean} withSize Whether to include size information. Default true.
 * @param {boolean} shortened Ensure the extension of the file name is visible. Default false.
 * @return {string} the human-readable link text for the attachment.
 */
export function presentableTextForFile(
    content: MediaEventContent,
    fallbackText = _t("common|attachment"),
    withSize = true,
    shortened = false,
): string {
    let text = fallbackText;
    if (content.filename?.length) {
        text = content.filename;
    } else if (content.body?.length) {
        // The content body should be the name of the file including a
        // file extension.
        text = content.body;
    }

    // We shorten to 15 characters somewhat arbitrarily, and assume most files
    // will have a 3 character (plus full stop) extension. The goal is to knock
    // the label down to 15-25 characters, not perfect accuracy.
    if (shortened && text.length > 19) {
        const parts = text.split(".");
        let fileName = parts
            .slice(0, parts.length - 1)
            .join(".")
            .substring(0, 15);
        const extension = parts[parts.length - 1];

        // Trim off any full stops from the file name to avoid a case where we
        // add an ellipsis that looks really funky.
        fileName = fileName.replace(/\.*$/g, "");

        text = `${fileName}...${extension}`;
    }

    if (content.info?.size && withSize) {
        // If we know the size of the file then add it as human readable
        // string to the end of the link text so that the user knows how
        // big a file they are downloading.
        // The content.info also contains a MIME-type but we don't display
        // it since it is "ugly", users generally aren't aware what it
        // means and the type of the attachment can usually be inferred
        // from the file extension.
        text += " (" + <string>fileSize(content.info.size, { base: 2, standard: "jedec" }) + ")";
    }
    return text;
}

type FileSizeOptions =
    | FileSizeOptionsString
    | FileSizeOptionsBase
    | FileSizeOptionsArray
    | FileSizeOptionsExponent
    | FileSizeOptionsObject;

/**
 * wrapper function to set default values for filesize function
 *
 * @param byteCount size of file
 * @param options options to customize the response type or size type conversion e.g. 12kB, 12KB
 * @returns {string | number | any[] | {
 *  value: any;
 *  symbol: any;
 *  exponent: number;
 *  unit: string;}} formatted file size with unit e.g. 12kB, 12KB
 */
export function fileSize(byteCount: number, options: FileSizeOptionsString | FileSizeOptionsBase): string;
export function fileSize(byteCount: number, options: FileSizeOptionsArray): FileSizeReturnArray;
export function fileSize(byteCount: number, options: FileSizeOptionsExponent): number;
export function fileSize(byteCount: number, options: FileSizeOptionsObject): FileSizeReturnObject;
export function fileSize(byteCount: number): string;
export function fileSize(
    byteCount: number,
    options?: FileSizeOptions,
): string | number | FileSizeReturnArray | FileSizeReturnObject {
    return filesize(byteCount, {
        base: 10,
        standard: 'jedec',
        ...options,
    });
}

type FileType = 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'other';

/**
 * Determines the type of a file based on its name and MIME type.
 * @param filename The name of the file
 * @param mimeType Optional MIME type of the file
 * @returns The determined file type
 */
export function fileType(filename: string, mimeType?: string): FileType {
    if (!filename) return 'other';
    
    const lowerFilename = filename.toLowerCase();
    
    // Check MIME type first if available
    if (mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.startsWith('text/')) return 'text';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
    }
    
    // Fall back to file extension if MIME type is not available or not recognized
    const extension = lowerFilename.split('.').pop() || '';
    
    // Image extensions
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'];
    if (imageExtensions.includes(extension)) return 'image';
    
    // PDF
    if (extension === 'pdf') return 'pdf';
    
    // Text files
    const textExtensions = ['txt', 'md', 'markdown', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rb', 'php', 'sh', 'bat', 'cmd', 'ps1', 'env', 'gitignore', 'yml', 'yaml', 'log'];
    if (textExtensions.includes(extension)) return 'text';
    
    // Video files
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v', '3gp'];
    if (videoExtensions.includes(extension)) return 'video';
    
    // Audio files
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'];
    if (audioExtensions.includes(extension)) return 'audio';
    
    return 'other';
}
