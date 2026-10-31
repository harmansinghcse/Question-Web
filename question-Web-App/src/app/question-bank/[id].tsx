import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/ThemeProvider";
import {
    Badge,
    ErrorBlock,
    LoadingBlock,
    MarkdownText,
    TYPE_META,
} from "../../components/ui";
import { api, type QuestionDetail } from "../../services/api";
import type { AppTheme } from "../../constants/theme";

export default function QuestionDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const { theme } = useAppTheme();

    const containerWidth = Math.min(windowWidth, 880);
    const s = useMemo(
        () => makeStyles(theme, insets, containerWidth),
        [theme, insets, containerWidth],
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [question, setQuestion] = useState<QuestionDetail | null>(null);

    // Multi-image Modal viewer state
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
        null,
    );
    const [failedImageIds, setFailedImageIds] = useState<Set<number>>(
        new Set(),
    );

    const loadQuestion = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getQuestionById(Number(id));
            setQuestion(data);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load question details.",
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;
        let isMounted = true;
        api.getQuestionById(Number(id))
            .then((data) => {
                if (isMounted) {
                    setQuestion(data);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load question details.",
                    );
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [id]);

    const typeMeta = question
        ? TYPE_META[question.quesType] ?? TYPE_META.SUBJECTIVE
        : TYPE_META.SUBJECTIVE;

    const currentModalImage =
        question &&
        selectedImageIndex !== null &&
        question.images[selectedImageIndex]
            ? question.images[selectedImageIndex]
            : null;

    const handlePrevModalImage = () => {
        if (selectedImageIndex === null || !question) return;
        setSelectedImageIndex((prev) =>
            prev !== null && prev > 0 ? prev - 1 : question.images.length - 1,
        );
    };

    const handleNextModalImage = () => {
        if (selectedImageIndex === null || !question) return;
        setSelectedImageIndex((prev) =>
            prev !== null && prev < question.images.length - 1 ? prev + 1 : 0,
        );
    };

    const markImageFailed = (imageId: number) => {
        setFailedImageIds((prev) => new Set(prev).add(imageId));
    };

    return (
        <View style={s.screen}>
            {/* Top Navigation Header with safe area support */}
            <View style={s.header}>
                <View style={s.headerInner}>
                    <Pressable
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/question-bank");
                            }
                        }}
                        style={({ pressed }) => [
                            s.backButton,
                            pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        hitSlop={8}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={20}
                            color={theme.text}
                        />
                    </Pressable>

                    <View style={s.headerText}>
                        <Text style={s.eyebrow}>QUESTION DETAIL</Text>
                        <Text style={s.title} numberOfLines={1}>
                            {question
                                ? `Question #${question.quesId}`
                                : "Question"}
                        </Text>
                    </View>

                    {question && (
                        <Badge
                            label={typeMeta.short}
                            color={typeMeta.color}
                            icon={typeMeta.icon}
                        />
                    )}
                </View>
            </View>

            {/* Main Content Area */}
            {loading && (
                <View style={s.centerBlock}>
                    <LoadingBlock label="Fetching question details…" />
                </View>
            )}

            {!loading && error && (
                <View style={s.centerBlock}>
                    <ErrorBlock
                        title="Couldn't load question"
                        message={error}
                        onRetry={loadQuestion}
                    />
                </View>
            )}

            {!loading && !error && question && (
                <ScrollView
                    style={s.scrollView}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={s.contentInner}>
                        {/* Metadata Card: Subject, Chapter, Topics */}
                        <View style={s.metaCard}>
                            {/* Subject & Chapter */}
                            <View style={s.hierarchyBlock}>
                                {question.subject && (
                                    <View style={s.metaRow}>
                                        <Ionicons
                                            name="book-outline"
                                            size={15}
                                            color={theme.accent}
                                        />
                                        <Text style={s.metaLabel}>Subject:</Text>
                                        <Text style={s.metaValue}>
                                            {question.subject.subjectId} —{" "}
                                            {question.subject.subjectName ??
                                                "N/A"}
                                            {question.subject.semester != null
                                                ? ` (Sem ${question.subject.semester})`
                                                : ""}
                                        </Text>
                                    </View>
                                )}

                                {question.chapter && (
                                    <View style={s.metaRow}>
                                        <Ionicons
                                            name="albums-outline"
                                            size={15}
                                            color={theme.accent}
                                        />
                                        <Text style={s.metaLabel}>Chapter:</Text>
                                        <Text style={s.metaValue}>
                                            {question.chapter.chapterNo}.{" "}
                                            {question.chapter.chapterName}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Topics */}
                            {question.topics && question.topics.length > 0 && (
                                <View style={s.topicsBlock}>
                                    <Text style={s.sectionSubtitle}>
                                        Tagged Topics
                                    </Text>
                                    <View style={s.pillList}>
                                        {question.topics.map((t) => (
                                            <View
                                                key={t.topicId}
                                                style={s.topicBadge}
                                            >
                                                <Ionicons
                                                    name="pricetag-outline"
                                                    size={11}
                                                    color={theme.accent}
                                                />
                                                <Text style={s.topicBadgeText}>
                                                    {t.topicName}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Source details */}
                            {question.source && (
                                <View style={s.sourceBlock}>
                                    <Text style={s.sectionSubtitle}>
                                        Source / Reference
                                    </Text>
                                    <View style={s.sourceCard}>
                                        <Ionicons
                                            name={
                                                question.source.sourceType ===
                                                "EXAM"
                                                    ? "newspaper-outline"
                                                    : "library-outline"
                                            }
                                            size={18}
                                            color={theme.muted}
                                        />
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={s.sourceLabelText}>
                                                {question.source.label}
                                            </Text>
                                            <Text style={s.sourceSubtext}>
                                                {question.source.sourceType ===
                                                "EXAM"
                                                    ? `Exam Type: ${question.source.examType ?? "Semester Exam"}${question.source.examYear ? ` · Year ${question.source.examYear}` : ""}`
                                                    : `Author: ${question.source.authorName ?? "Unknown Author"}`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Question Statement Card */}
                        <View style={s.questionCard}>
                            <View style={s.cardHeader}>
                                <Ionicons
                                    name="help-circle-outline"
                                    size={18}
                                    color={typeMeta.color}
                                />
                                <Text style={s.cardHeaderTitle}>
                                    Question Statement
                                </Text>
                            </View>
                            <View style={s.markdownContainer}>
                                <MarkdownText>{question.quesText}</MarkdownText>
                            </View>
                        </View>

                        {/* Attached Images Section - only rendered if question has images */}
                        {question.images && question.images.length > 0 && (
                            <View style={s.imagesSection}>
                                <View style={s.imagesHeader}>
                                    <View style={s.imagesHeaderLeft}>
                                        <Ionicons
                                            name="image-outline"
                                            size={18}
                                            color={theme.accent}
                                        />
                                        <Text style={s.imagesHeaderTitle}>
                                            Attached Images
                                        </Text>
                                        <View style={s.imageCountBadge}>
                                            <Text style={s.imageCountText}>
                                                {question.images.length}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={s.tapHint}>
                                        Tap image to enlarge
                                    </Text>
                                </View>

                                <View style={s.imagesGrid}>
                                    {question.images.map((img, idx) => {
                                        const hasFailed =
                                            failedImageIds.has(img.imageId) ||
                                            !img.imageUrl ||
                                            !img.imageUrl.trim();
                                        const isSingle =
                                            question.images.length === 1;

                                        return (
                                            <Pressable
                                                key={img.imageId}
                                                onPress={() =>
                                                    setSelectedImageIndex(idx)
                                                }
                                                accessibilityRole="button"
                                                accessibilityLabel={`Enlarge image ${idx + 1}`}
                                                style={({ pressed }) => [
                                                    s.imageThumbnailWrapper,
                                                    isSingle &&
                                                        s.singleImageThumbnailWrapper,
                                                    pressed && { opacity: 0.85 },
                                                ]}
                                            >
                                                {hasFailed ? (
                                                    <View
                                                        style={
                                                            s.imageFailedFallback
                                                        }
                                                    >
                                                        <Ionicons
                                                            name="alert-circle-outline"
                                                            size={22}
                                                            color={theme.muted}
                                                        />
                                                        <Text
                                                            style={
                                                                s.imageFailedText
                                                            }
                                                        >
                                                            Image Unavailable
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Image
                                                        source={{
                                                            uri: (
                                                                img.imageUrl ||
                                                                ""
                                                            ).trim(),
                                                        }}
                                                        style={s.imageThumbnail}
                                                        contentFit={
                                                            isSingle
                                                                ? "contain"
                                                                : "cover"
                                                        }
                                                        transition={300}
                                                        onError={() =>
                                                            markImageFailed(
                                                                img.imageId,
                                                            )
                                                        }
                                                    />
                                                )}
                                                <View style={s.imageIndexTag}>
                                                    <Text
                                                        style={
                                                            s.imageIndexTagText
                                                        }
                                                    >
                                                        #{idx + 1}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Full-Screen Tap-To-Enlarge Image Modal with Multi-Image Navigation */}
            <Modal
                visible={selectedImageIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImageIndex(null)}
            >
                <View style={s.modalOverlay}>
                    {/* Modal Bar with safe area padding */}
                    <View style={s.modalBar}>
                        <Text style={s.modalBarTitle}>
                            {question && question.images.length > 1
                                ? `Image ${(selectedImageIndex ?? 0) + 1} of ${question.images.length}`
                                : "Image Preview"}
                        </Text>
                        <Pressable
                            onPress={() => setSelectedImageIndex(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Close enlarged viewer"
                            style={s.modalCloseButton}
                            hitSlop={10}
                        >
                            <Ionicons
                                name="close-circle"
                                size={30}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>

                    {/* Enlarged Image Container with Prev/Next buttons */}
                    <View style={s.modalImageContainer}>
                        {currentModalImage &&
                            (failedImageIds.has(currentModalImage.imageId) ||
                            !currentModalImage.imageUrl?.trim() ? (
                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 10,
                                    }}
                                >
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={48}
                                        color="#9CA3AF"
                                    />
                                    <Text
                                        style={{
                                            color: "#D1D5DB",
                                            fontSize: 14,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Image Unavailable
                                    </Text>
                                </View>
                            ) : (
                                <Image
                                    source={{
                                        uri: (
                                            currentModalImage.imageUrl || ""
                                        ).trim(),
                                    }}
                                    style={s.modalImage}
                                    contentFit="contain"
                                    transition={200}
                                    onError={() =>
                                        markImageFailed(
                                            currentModalImage.imageId,
                                        )
                                    }
                                />
                            ))}

                        {question && question.images.length > 1 && (
                            <>
                                <Pressable
                                    onPress={handlePrevModalImage}
                                    style={[s.modalNavButton, { left: 16 }]}
                                    accessibilityLabel="Previous image"
                                    hitSlop={12}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={28}
                                        color="#FFFFFF"
                                    />
                                </Pressable>

                                <Pressable
                                    onPress={handleNextModalImage}
                                    style={[s.modalNavButton, { right: 16 }]}
                                    accessibilityLabel="Next image"
                                    hitSlop={12}
                                >
                                    <Ionicons
                                        name="chevron-forward"
                                        size={28}
                                        color="#FFFFFF"
                                    />
                                </Pressable>
                            </>
                        )}
                    </View>

                    {/* Dot Pagination indicators if multiple images */}
                    {question && question.images.length > 1 && (
                        <View style={s.modalDotsRow}>
                            {question.images.map((img, dotIdx) => (
                                <View
                                    key={img.imageId}
                                    style={[
                                        s.modalDot,
                                        dotIdx === selectedImageIndex &&
                                            s.modalDotActive,
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

function makeStyles(
    t: AppTheme,
    insets: { top: number; bottom: number; left: number; right: number },
    containerWidth: number,
) {
    const innerAvailWidth = Math.max(240, containerWidth - 64);
    const thumbWidth = Math.floor((innerAvailWidth - 10) / 2);

    return StyleSheet.create({
        screen: {
            flex: 1,
            minHeight: 0,
            backgroundColor: t.background,
        },
        header: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            backgroundColor: t.surface,
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: 14,
            paddingHorizontal: 16,
        },
        headerInner: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
        },
        backButton: {
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        },
        headerText: {
            flex: 1,
            minWidth: 0,
        },
        eyebrow: {
            color: t.accent,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.2,
        },
        title: {
            color: t.text,
            fontSize: 18,
            fontWeight: "800",
        },
        centerBlock: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            maxWidth: 880,
            width: "100%",
            alignSelf: "center",
        },
        scrollView: {
            flex: 1,
            minHeight: 0,
        },
        scrollContent: {
            padding: 16,
            paddingBottom: Math.max(insets.bottom + 24, 44),
        },
        contentInner: {
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
            gap: 16,
        },

        /* Meta card */
        metaCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 14,
        },
        hierarchyBlock: {
            gap: 8,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
        },
        metaLabel: {
            fontSize: 12,
            fontWeight: "700",
            color: t.muted,
            marginTop: 1,
        },
        metaValue: {
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
            flex: 1,
            lineHeight: 18,
        },
        sectionSubtitle: {
            fontSize: 11,
            fontWeight: "800",
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 6,
        },
        topicsBlock: {
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        pillList: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
        },
        topicBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            maxWidth: "100%",
        },
        topicBadgeText: {
            fontSize: 11,
            color: t.text,
            fontWeight: "600",
            flexShrink: 1,
        },
        sourceBlock: {
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        sourceCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: t.surfaceAlt,
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
        },
        sourceLabelText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.text,
        },
        sourceSubtext: {
            fontSize: 11,
            color: t.muted,
            marginTop: 1,
        },

        /* Question statement card */
        questionCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
        },
        cardHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        cardHeaderTitle: {
            fontSize: 14,
            fontWeight: "800",
            color: t.text,
        },
        markdownContainer: {
            minHeight: 40,
        },

        /* Images section */
        imagesSection: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 12,
        },
        imagesHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        imagesHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        imagesHeaderTitle: {
            fontSize: 14,
            fontWeight: "800",
            color: t.text,
        },
        imageCountBadge: {
            backgroundColor: t.accentSoft,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 1,
        },
        imageCountText: {
            fontSize: 11,
            fontWeight: "800",
            color: t.accent,
        },
        tapHint: {
            fontSize: 11,
            color: t.muted,
            fontStyle: "italic",
        },
        imagesGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        imageThumbnailWrapper: {
            width: thumbWidth,
            height: 140,
            borderRadius: 10,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surfaceAlt,
            position: "relative",
        },
        singleImageThumbnailWrapper: {
            width: innerAvailWidth,
            height: 220,
        },
        imageThumbnail: {
            width: "100%",
            height: "100%",
        },
        imageFailedFallback: {
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            backgroundColor: t.surfaceAlt,
        },
        imageFailedText: {
            fontSize: 10,
            color: t.muted,
            fontWeight: "600",
        },
        imageIndexTag: {
            position: "absolute",
            top: 6,
            left: 6,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        imageIndexTagText: {
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "700",
        },

        /* Modal viewer */
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            justifyContent: "space-between",
        },
        modalBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: 16,
        },
        modalBarTitle: {
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "700",
        },
        modalCloseButton: {
            padding: 4,
        },
        modalImageContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
        },
        modalImage: {
            width: "100%",
            height: "100%",
        },
        modalNavButton: {
            position: "absolute",
            top: "50%",
            marginTop: -22,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255, 255, 255, 0.18)",
            alignItems: "center",
            justifyContent: "center",
        },
        modalDotsRow: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            paddingVertical: 20,
            paddingBottom: Math.max(insets.bottom + 16, 28),
        },
        modalDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "rgba(255, 255, 255, 0.35)",
        },
        modalDotActive: {
            width: 20,
            backgroundColor: "#FFFFFF",
        },
    });
}
