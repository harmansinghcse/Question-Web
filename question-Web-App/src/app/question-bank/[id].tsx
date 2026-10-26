import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAppTheme } from "../../providers/ThemeProvider";
import {
    Badge,
    ErrorBlock,
    LoadingBlock,
    MarkdownText,
    TYPE_META,
} from "../../components/ui";
import {
    api,
    type QuestionDetail,
    type QuestionImage,
} from "../../services/api";
import type { AppTheme } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function QuestionDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [question, setQuestion] = useState<QuestionDetail | null>(null);

    // Image Modal viewer state
    const [selectedImage, setSelectedImage] = useState<QuestionImage | null>(
        null,
    );

    const loadQuestion = async () => {
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
    };

    useEffect(() => {
        loadQuestion();
    }, [id]);

    const typeMeta = question
        ? TYPE_META[question.quesType] ?? TYPE_META.SUBJECTIVE
        : TYPE_META.SUBJECTIVE;

    return (
        <View style={s.screen}>
            {/* Top Navigation Header */}
            <View style={s.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        s.backButton,
                        pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                >
                    <Ionicons name="chevron-back" size={20} color={theme.text} />
                </Pressable>

                <View style={s.headerText}>
                    <Text style={s.eyebrow}>QUESTION DETAIL</Text>
                    <Text style={s.title}>
                        {question ? `Question #${question.quesId}` : "Question"}
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
                                        {question.subject.subjectName ?? "N/A"}
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
                                            question.source.sourceType === "EXAM"
                                                ? "newspaper-outline"
                                                : "library-outline"
                                        }
                                        size={18}
                                        color={theme.muted}
                                    />
                                    <View style={{ flex: 1 }}>
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

                    {/* Attached Images Section */}
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
                            {question.images.length > 0 && (
                                <Text style={s.tapHint}>
                                    Tap image to enlarge
                                </Text>
                            )}
                        </View>

                        {question.images.length === 0 ? (
                            <View style={s.noImagesCard}>
                                <Ionicons
                                    name="images-outline"
                                    size={28}
                                    color={theme.border}
                                />
                                <Text style={s.noImagesText}>
                                    No figures or diagrams attached to this
                                    question.
                                </Text>
                            </View>
                        ) : (
                            <View style={s.imagesGrid}>
                                {question.images.map((img, idx) => (
                                    <Pressable
                                        key={img.imageId}
                                        onPress={() => setSelectedImage(img)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Enlarge image ${idx + 1}`}
                                        style={({ pressed }) => [
                                            s.imageThumbnailWrapper,
                                            pressed && { opacity: 0.85 },
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: img.imageUrl }}
                                            style={s.imageThumbnail}
                                            contentFit="cover"
                                            transition={300}
                                        />
                                        <View style={s.imageIndexTag}>
                                            <Text style={s.imageIndexTagText}>
                                                #{idx + 1}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Full-Screen Tap-To-Enlarge Image Modal */}
            <Modal
                visible={selectedImage !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={s.modalOverlay}>
                    {/* Modal Bar */}
                    <View style={s.modalBar}>
                        <Text style={s.modalBarTitle}>
                            Image Preview
                        </Text>
                        <Pressable
                            onPress={() => setSelectedImage(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Close enlarged viewer"
                            style={s.modalCloseButton}
                            hitSlop={10}
                        >
                            <Ionicons
                                name="close-circle"
                                size={28}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>

                    {/* Enlarged Image Container */}
                    <View style={s.modalImageContainer}>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage.imageUrl }}
                                style={s.modalImage}
                                contentFit="contain"
                                transition={200}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: t.background,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            backgroundColor: t.surface,
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
        },
        headerText: {
            flex: 1,
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
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            padding: 16,
            gap: 16,
            paddingBottom: 40,
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
            alignItems: "center",
            gap: 8,
        },
        metaLabel: {
            fontSize: 12,
            fontWeight: "700",
            color: t.muted,
        },
        metaValue: {
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
            flex: 1,
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
        },
        topicBadgeText: {
            fontSize: 11,
            color: t.text,
            fontWeight: "600",
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
        noImagesCard: {
            backgroundColor: t.surfaceAlt,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.border,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        noImagesText: {
            fontSize: 12,
            color: t.muted,
            textAlign: "center",
        },
        imagesGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        imageThumbnailWrapper: {
            width: (SCREEN_WIDTH - 64) / 2,
            height: 140,
            borderRadius: 10,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surfaceAlt,
            position: "relative",
        },
        imageThumbnail: {
            width: "100%",
            height: "100%",
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
            backgroundColor: "rgba(0, 0, 0, 0.94)",
            justifyContent: "space-between",
        },
        modalBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 48,
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
            padding: 16,
        },
        modalImage: {
            width: "100%",
            height: "100%",
        },
    });
}
