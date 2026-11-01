import React, { useEffect, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
    Path,
    Defs,
    LinearGradient as SvgGradient,
    Stop,
    G,
    Circle,
} from "react-native-svg";

export default function QuestionWebSplash() {
    const { width } = useWindowDimensions();

    // Animation Refs
    const [rotateAnim] = useState(() => new Animated.Value(0));
    const [pulseAnim] = useState(() => new Animated.Value(1));
    const [fadeAnim] = useState(() => new Animated.Value(0));
    const [slideAnim] = useState(() => new Animated.Value(20));

    // Scatter/float animations for background educational shapes
    const [floatAnim1] = useState(() => new Animated.Value(0));
    const [floatAnim2] = useState(() => new Animated.Value(0));
    const [floatAnim3] = useState(() => new Animated.Value(0));

    useEffect(() => {
        // Entrance Anim
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
        ]).start();

        // 1. Loading Ring Rotation loop
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1100,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ).start();

        // 2. Continuous Pulse for Branding Logo
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.97,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ).start();

        // 3. Gentle sway loop for decorative outlines
        const createSway = (
            anim: Animated.Value,
            max: number,
            duration: number,
        ) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: max,
                        duration: duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: -max,
                        duration: duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        Animated.parallel([
            createSway(floatAnim1, 8, 2500),
            createSway(floatAnim2, -6, 2800),
            createSway(floatAnim3, 7, 3200),
        ]).start();
    }, [fadeAnim, slideAnim, rotateAnim, pulseAnim, floatAnim1, floatAnim2, floatAnim3]);

    const spinRotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={s.container}>
            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor="transparent"
            />

            {/* BACKGROUND GRAPHIC: Glows from top-left and bottom-right */}
            <View
                style={[
                    s.gradientCornerTL,
                    { width: width * 0.9, height: width * 0.9 },
                ]}
            />
            <View
                style={[
                    s.gradientCornerBR,
                    { width: width * 0.95, height: width * 0.95 },
                ]}
            />

            {/* FLOATING EDUCATIONAL OUTLINES */}
            <Animated.View
                style={[
                    s.iconBox,
                    {
                        top: "12%",
                        left: "10%",
                        opacity: 0.25,
                        transform: [{ translateY: floatAnim1 }],
                    },
                ]}
            >
                {/* Clipboard */}
                <Svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M19 4h-3.08a3 3 0 00-5.84 0H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-7-1a1 1 0 110 2 1 1 0 010-2zM9 14l2 2 4-4"
                        stroke="#A855F7"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        top: "8%",
                        right: "12%",
                        opacity: 0.2,
                        transform: [{ translateY: floatAnim2 }],
                    },
                ]}
            >
                {/* Open Book */}
                <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3zm20 0h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z"
                        stroke="#EC4899"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        top: "24%",
                        right: "8%",
                        opacity: 0.25,
                        transform: [{ translateY: floatAnim3 }],
                    },
                ]}
            >
                {/* Bar chart upward arrow */}
                <Svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M18 20V10M12 20V4M6 20v-6M3 20h18M17 5l4 4m0 0l-4 4m4-4H9"
                        stroke="#3B82F6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        top: "42%",
                        right: "6%",
                        opacity: 0.2,
                        transform: [{ translateY: floatAnim1 }],
                    },
                ]}
            >
                {/* Atom */}
                <Svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="2.5" fill="#C084FC" />
                    <Path
                        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                        stroke="#C084FC"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                    />
                    <Path
                        d="M4.5 12c0-3.5 3-7 7.5-7s7.5 3.5 7.5 7-3 7-7.5 7-7.5-3.5-7.5-7z"
                        stroke="#C084FC"
                        strokeWidth="1"
                        transform="rotate(30 12 12)"
                    />
                    <Path
                        d="M4.5 12c0-3.5 3-7 7.5-7s7.5 3.5 7.5 7-3 7-7.5 7-7.5-3.5-7.5-7z"
                        stroke="#C084FC"
                        strokeWidth="1"
                        transform="rotate(-30 12 12)"
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        bottom: "34%",
                        left: "8%",
                        opacity: 0.18,
                        transform: [{ translateY: floatAnim2 }],
                    },
                ]}
            >
                {/* Flask */}
                <Svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M9 3h6M10 3v6.34a2 2 0 01-.586 1.414l-4.828 4.828A4 4 0 007.414 22h9.172a4 4 0 002.828-6.828l-4.828-4.828a2 2 0 01-.586-1.414V3"
                        stroke="#F43F5E"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        bottom: "24%",
                        right: "10%",
                        opacity: 0.22,
                        transform: [{ translateY: floatAnim3 }],
                    },
                ]}
            >
                {/* Book stack */}
                <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5h16M4 19.5V5a2.5 2.5 0 012.5-2.5H20v14M6 6h10M6 10h10"
                        stroke="#8B5CF6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path d="M4 15.5H20" stroke="#8B5CF6" strokeWidth="1.5" />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    s.iconBox,
                    {
                        bottom: "16%",
                        left: "12%",
                        opacity: 0.25,
                        transform: [{ translateY: floatAnim1 }],
                    },
                ]}
            >
                {/* Light Bulb */}
                <Svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M15 14c.75-1 1.5-2.5 1.5-4a4.5 4.5 0 00-9 0c0 1.5.75 3 1.5 4M9 18h6M10 21h4"
                        stroke="#EAB308"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>

            <SafeAreaView style={s.safeBoundary}>
                <Animated.View
                    style={[
                        s.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* BRAND LOGO EMBLEM: Q shape + Book + Cap */}
                    <Animated.View
                        style={[
                            s.logoContainer,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <Svg
                            width="168"
                            height="152"
                            viewBox="0 0 100 90"
                            fill="none"
                        >
                            <Defs>
                                <SvgGradient
                                    id="capGrad"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <Stop offset="0%" stopColor="#A855F7" />
                                    <Stop offset="50%" stopColor="#8B5CF6" />
                                    <Stop offset="100%" stopColor="#EC4899" />
                                </SvgGradient>
                                <SvgGradient
                                    id="qGrad"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <Stop offset="0%" stopColor="#FFFFFF" />
                                    <Stop offset="100%" stopColor="#E2E8F0" />
                                </SvgGradient>
                                <SvgGradient
                                    id="bookGrad"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <Stop offset="0%" stopColor="#D946EF" />
                                    <Stop offset="100%" stopColor="#8B5CF6" />
                                </SvgGradient>
                            </Defs>

                            {/* GRADUATION CAP (TOP) */}
                            <G transform="translate(5, 5)">
                                {/* Tassel */}
                                <Path
                                    d="M18,30 Q16,33 16,38 L19,38 Z"
                                    fill="url(#capGrad)"
                                />
                                <Circle
                                    cx="18"
                                    cy="30"
                                    r="1.5"
                                    fill="#8B5CF6"
                                />
                                {/* Main Cap Diamond */}
                                <Path
                                    d="M45,8 L15,20 L45,30 L75,20 Z"
                                    fill="url(#capGrad)"
                                />
                                <Path
                                    d="M45,20 L45,30 L55,27"
                                    fill="#6B21A8"
                                    opacity="0.3"
                                />
                                {/* Base & Skull Cap Band */}
                                <Path
                                    d="M28,24 L28,30 C28,34 62,34 62,30 L62,24 L45,28.5 Z"
                                    fill="#7C3AED"
                                />
                            </G>

                            {/* THE "Q" LETTER (MIDDLE) */}
                            <G transform="translate(10, 16)">
                                {/* Capital Q Outer-Inner Circular Shape */}
                                <Path
                                    d="M40,16 C25,16 13,27 13,42 C13,57 25,68 40,68 C45,68 49,67 53,64 L59,70 C52,75 42,76 38,76 C17,76 0,61 0,42 C0,23 17,8 38,8 C53,8 66,16 71,28 L63,33 C60,23 51,16 40,16 Z"
                                    fill="url(#qGrad)"
                                />
                                {/* Tail of the Q */}
                                <Path
                                    d="M52,50 L64,62 L74,58 L62,46 Z"
                                    fill="url(#qGrad)"
                                />
                            </G>

                            {/* OPEN BOOK (BOTTOM) */}
                            <G transform="translate(1, 46)">
                                {/* Base outline back layers */}
                                <Path
                                    d="M49,15 C26,4 4,11 4,11 L4,23 C4,23 26,16 49,27 C72,16 94,23 94,23 L94,11 C94,11 72,4 49,15 Z"
                                    fill="#4C1D95"
                                />
                                {/* Open Book Wings */}
                                <Path
                                    d="M49,12 C25,1 2,8 2,8 L2,19 C2,19 25,12 49,23 C73,12 96,19 96,19 L96,8 C96,8 73,1 49,12 Z"
                                    fill="url(#bookGrad)"
                                />
                                {/* Inner Pages Left */}
                                <Path
                                    d="M47,13.5 C26,3.5 5,10 5,10 L5,20.5 C5,20.5 26,14 47,24 Z"
                                    fill="#F8FAFC"
                                />
                                {/* Inner Pages Right */}
                                <Path
                                    d="M51,13.5 C72,3.5 93,10 93,10 L93,20.5 C93,20.5 72,14 51,24 Z"
                                    fill="#E2E8F0"
                                />

                                {/* Bookmark (Right Ribbon) */}
                                <Path
                                    d="M73,15 L73,28 L78,25 L83,28 L83,15.5 Z"
                                    fill="#EC4899"
                                />
                            </G>
                        </Svg>
                    </Animated.View>

                    {/* BRAND TEXT: "Question Web" */}
                    <View style={s.brandRow}>
                        <Text style={s.brandQuestion}>Question </Text>
                        <Text style={s.brandWeb}>Web</Text>
                    </View>

                    {/* ACADEMIC DECORATIVE LINE: ── 🎓 ── */}
                    <View style={s.dividerRow}>
                        <View style={s.dividerLine} />
                        <Svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="#A855F7"
                            style={s.miniCap}
                        >
                            <Path d="M12 2L1 7l11 5 11-5-11-5zM1 7v6c0 3 4 5 11 5s11-2 11-5V7" />
                            <Path
                                d="M12 18v4"
                                stroke="#A855F7"
                                strokeWidth="2"
                            />
                        </Svg>
                        <View style={s.dividerLine} />
                    </View>

                    {/* SPACED TAGLINE */}
                    <Text style={s.tagline}>
                        LEARN • PRACTICE • REVISE • ACHIEVE
                    </Text>

                    {/* ROTATING LOADER AND TEXT (BOTTOM AREA) */}
                    <View style={s.loadingArea}>
                        <Animated.View
                            style={{ transform: [{ rotate: spinRotation }] }}
                        >
                            <Svg
                                width="40"
                                height="40"
                                viewBox="0 0 36 36"
                                fill="none"
                            >
                                {/* Back static Track */}
                                <Circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    stroke="rgba(168, 85, 247, 0.15)"
                                    strokeWidth="3"
                                />
                                {/* Active Rotating Part */}
                                <Circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    stroke="#F43F5E"
                                    strokeWidth="3"
                                    strokeDasharray="30 80"
                                    strokeLinecap="round"
                                />
                            </Svg>
                        </Animated.View>
                        <Text style={s.loadingText}>Loading...</Text>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#070610", // Rich navy-black
        alignItems: "center",
        justifyContent: "center",
    },
    safeBoundary: {
        flex: 1,
        width: "100%",
    },
    gradientCornerTL: {
        position: "absolute",
        top: -80,
        left: -80,
        borderRadius: 999,
        backgroundColor: "rgba(124, 58, 237, 0.35)", // Purple-magenta radial simulation
        shadowColor: "#7c3aed",
        shadowOpacity: 0.9,
        shadowRadius: 110,
        elevation: 20,
    },
    gradientCornerBR: {
        position: "absolute",
        bottom: -110,
        right: -110,
        borderRadius: 999,
        backgroundColor: "rgba(162, 28, 175, 0.3)", // Violet/fuchsia glow simulation
        shadowColor: "#a21caf",
        shadowOpacity: 0.8,
        shadowRadius: 130,
        elevation: 20,
    },
    iconBox: {
        position: "absolute",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    logoContainer: {
        marginBottom: 16,
        shadowColor: "#A855F7",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 8,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },
    brandQuestion: {
        fontSize: 32,
        fontWeight: "900",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    brandWeb: {
        fontSize: 32,
        fontWeight: "900",
        color: "#D946EF", // Custom gradient/magenta feel matching reference
        letterSpacing: -0.5,
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "50%",
        justifyContent: "center",
        marginBottom: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "rgba(168, 85, 247, 0.4)",
    },
    miniCap: {
        marginHorizontal: 8,
    },
    tagline: {
        fontSize: 10,
        fontWeight: "800",
        color: "rgba(255, 255, 255, 0.75)",
        letterSpacing: 2,
        marginBottom: 64,
    },
    loadingArea: {
        alignItems: "center",
        marginTop: 24,
    },
    loadingText: {
        marginTop: 10,
        color: "rgba(255, 255, 255, 0.65)",
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 1,
    },
});
