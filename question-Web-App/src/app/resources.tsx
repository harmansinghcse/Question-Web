import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppShell from "../components/AppShell";
import { StudyResourcesCatalogView } from "./learn";
import { useAppTheme } from "../providers/ThemeProvider";
import type { AppTheme } from "../constants/theme";

export default function ResourcesScreen() {
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    return (
        <AppShell active="resources">
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerTitleRow}>
                        <View style={s.headerAccent} />
                        <Text style={s.title}>Study Resources</Text>
                    </View>
                    <Text style={s.subtitle}>
                        Textbooks, course lecture slides, reference guides, and SVNIT academic scheme documents.
                    </Text>
                </View>

                <StudyResourcesCatalogView />
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
            gap: 18,
            paddingBottom: 28,
        },
        header: {
            gap: 4,
            marginBottom: 2,
        },
        headerTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
        },
        headerAccent: {
            width: 3.5,
            height: 18,
            borderRadius: 2,
            backgroundColor: t.accent,
        },
        title: {
            fontSize: 22,
            fontWeight: "800",
            color: t.text,
            letterSpacing: -0.3,
        },
        subtitle: {
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 18,
        },
    });
}
