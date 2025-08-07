/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { Text } from "@vector-im/compound-web";
import { Icon as CancelIcon } from "../../../../res/img/element-icons/cancel.svg";
import { formatDate } from "../../../DateUtils";
import { fileSize } from "../../../utils/FileUtils";
import Modal from "../../../Modal";

interface FileInfoModalProps {
    fileInfo: {
        event: MatrixEvent;
        filename: string;
        fileSize?: number;
        mimeType?: string;
        timestamp: number;
        sender: string;
        isEncrypted: boolean;
    };
    onClose: () => void;
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({ fileInfo, onClose }) => {
    return (
        <div className="mx_FileInfoModal">
            <div className="mx_FileInfoModal_header">
                <Text className="mx_FileInfoModal_title" weight="semibold">
                    File Information
                </Text>
                <button 
                    onClick={onClose}
                    className="mx_FileInfoModal_closeButton"
                    title="Close"
                    aria-label="Close"
                >
                    <CancelIcon />
                </button>
            </div>
            <div className="mx_FileInfoModal_content">
                <div className="mx_FileInfoModal_infoGrid">
                    <div className="mx_FileInfoModal_infoRow">
                        <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Name:</Text>
                        <Text className="mx_FileInfoModal_infoValue">{fileInfo.filename}</Text>
                    </div>
                    
                    {fileInfo.fileSize !== undefined && (
                        <div className="mx_FileInfoModal_infoRow">
                            <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Size:</Text>
                            <Text className="mx_FileInfoModal_infoValue">
                                {fileSize(fileInfo.fileSize, { base: 2, standard: "jedec" })}
                            </Text>
                        </div>
                    )}
                    
                    {fileInfo.mimeType && (
                        <div className="mx_FileInfoModal_infoRow">
                            <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Type:</Text>
                            <Text className="mx_FileInfoModal_infoValue">{fileInfo.mimeType}</Text>
                        </div>
                    )}
                    
                    <div className="mx_FileInfoModal_infoRow">
                        <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Uploaded:</Text>
                        <Text className="mx_FileInfoModal_infoValue">
                            {formatDate(new Date(fileInfo.timestamp))}
                        </Text>
                    </div>
                    
                    <div className="mx_FileInfoModal_infoRow">
                        <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Sender:</Text>
                        <Text className="mx_FileInfoModal_infoValue">{fileInfo.sender}</Text>
                    </div>
                    
                    <div className="mx_FileInfoModal_infoRow">
                        <Text className="mx_FileInfoModal_infoLabel" weight="semibold">Encrypted:</Text>
                        <Text className="mx_FileInfoModal_infoValue">{fileInfo.isEncrypted ? "Yes" : "No"}</Text>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to show the file info modal
export const showFileInfoModal = (fileInfo: FileInfoModalProps['fileInfo']) => {
    const modal = Modal.createDialog(
        FileInfoModal,
        { 
            fileInfo,
            onClose: () => {
                modal.close();
            },
        },
        'mx_FileInfoModal_wrapper',
        false,
        true,
        {
            onFinished: () => modal.close(),
            hasCancel: false,
        }
    );
};
