/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useMemo } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { MediaEventHelper } from "../../../utils/MediaEventHelper.ts";
import { fileType } from "../../../utils/FileUtils";
import { _t } from "../../../languageHandler";
import Modal from "../../../Modal";
import { Text } from "@vector-im/compound-web";
import { Icon as DownloadIcon } from "../../../../res/img/element-icons/roomlist/document-download.svg";
import { Icon as CancelIcon } from "../../../../res/img/element-icons/cancel.svg";

interface FileModalProps {
    fileEvent: {
        event: MatrixEvent;
        url: string;
        filename: string;
        fileSize?: number;
        mimeType?: string;
        isEncrypted: boolean;
    };
    onClose: () => void;
}

export const FileModal: React.FC<FileModalProps> = ({ fileEvent, onClose }) => {
    const [blob, setBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    const fileTypeInfo = useMemo(() => {
        return fileType(fileEvent.filename, fileEvent.mimeType);
    }, [fileEvent.filename, fileEvent.mimeType]);

    useEffect(() => {
        let isMounted = true;
        let mediaHelper: MediaEventHelper | null = null;

        const loadFile = async () => {
            try {
                setLoading(true);
                setError(null);

                if (fileEvent.isEncrypted) {
                    // Handle encrypted files
                    mediaHelper = new MediaEventHelper(fileEvent.event);
                    const encryptedBlob = await mediaHelper.sourceBlob.value;
                    if (!encryptedBlob) throw new Error("Failed to decrypt file");
                    if (isMounted) setBlob(encryptedBlob);
                } else {
                    // Handle unencrypted files
                    const response = await fetch(fileEvent.url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const responseBlob = await response.blob();
                    if (isMounted) setBlob(responseBlob);
                }
            } catch (e) {
                console.error("Error loading file:", e);
                if (isMounted) setError("Failed to load file");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadFile();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                setObjectUrl(null);
            }
            if (mediaHelper) {
                mediaHelper.destroy();
            }
        };
    }, [fileEvent]);

    useEffect(() => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
            setObjectUrl(null);
        };
    }, [blob]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="mx_FileModal_loading">
                    <div className="mx_Spinner" />
                    <Text>Loading file...</Text>
                </div>
            );
        }

        if (error || !objectUrl) {
            return (
                <div className="mx_FileModal_error">
                    <Text>{error || "Failed to load file"}</Text>
                </div>
            );
        }

        switch (fileTypeInfo) {
            case 'image':
                return (
                    <div className="mx_FileModal_imageContainer">
                        <img 
                            src={objectUrl} 
                            alt={fileEvent.filename}
                            className="mx_FileModal_image"
                        />
                    </div>
                );
            case 'pdf':
                return (
                    <div className="mx_FileModal_pdfContainer">
                        <iframe 
                            src={objectUrl} 
                            title={fileEvent.filename}
                            className="mx_FileModal_pdf"
                        />
                    </div>
                );
            case 'text':
                // For text files, we'll need to read the content
                return (
                    <div className="mx_FileModal_textContainer">
                        <pre className="mx_FileModal_text">
                            {blob ? new TextDecoder().decode(new Uint8Array(blob as any)) : ''}
                        </pre>
                    </div>
                );
            case 'video':
                return (
                    <div className="mx_FileModal_videoContainer">
                        <video 
                            src={objectUrl} 
                            controls 
                            className="mx_FileModal_video"
                        />
                    </div>
                );
            case 'audio':
                return (
                    <div className="mx_FileModal_audioContainer">
                        <audio 
                            src={objectUrl} 
                            controls 
                            className="mx_FileModal_audio"
                        />
                    </div>
                );
            default:
                return (
                    <div className="mx_FileModal_unsupported">
                        <Text>Preview not available</Text>
                        <Text className="mx_FileModal_downloadPrompt">
                            This file type cannot be previewed. Please download the file to view it.
                        </Text>
                    </div>
                );
        }
    };

    return (
        <div className="mx_FileModal">
            <div className="mx_FileModal_header">
                <Text className="mx_FileModal_filename" weight="semibold" truncate>
                    {fileEvent.filename}
                </Text>
                <div className="mx_FileModal_actions">
                    {objectUrl && (
                        <a 
                            href={objectUrl} 
                            download={fileEvent.filename}
                            className="mx_FileModal_downloadButton"
                            title="Download"
                        >
                            <DownloadIcon className="mx_FileModal_downloadIcon" />
                        </a>
                    )}
                    <button 
                        onClick={onClose}
                        className="mx_FileModal_closeButton2"
                        title="Close"
                    >
                        <CancelIcon />
                    </button>
                </div>
            </div>
            <div className="mx_FileModal_content">
                {renderContent()}
            </div>
        </div>
    );
};

// Helper function to show the file modal
export const showFileModal = (fileEvent: FileModalProps['fileEvent']) => {
    const modal = Modal.createDialog(
        FileModal,
        { 
            fileEvent,
            onClose: () => {
                modal.close();
            },
        },
        'mx_FileModal_wrapper',
        false,
        true,
        {
            onFinished: () => modal.close(),
            hasCancel: false,
        }
    );
};
