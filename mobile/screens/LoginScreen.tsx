// screens/LoginScreen.tsx
// Modern minimalist login & signup screen

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";

const THEME = {
  primary: "#4f46e5",
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

export function LoginScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="home" size={32} color={THEME.primary} />
          </View>
          <Text style={styles.title}>SmartHome</Text>
          <Text style={styles.subtitle}>Welcome to your modern control center</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>{isLogin ? "Sign In" : "Create Account"}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={THEME.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={THEME.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={THEME.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.mainBtn, loading && styles.btnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainBtnText}>{isLogin ? "Sign In" : "Register"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {isLogin ? "New here? " : "Already registered? "}
              <Text style={styles.toggleLink}>{isLogin ? "Create account" : "Sign in"}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 48 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800", color: THEME.text, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: THEME.textMuted, marginTop: 4, textAlign: "center" },
  form: {
    backgroundColor: THEME.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  formTitle: { fontSize: 20, fontWeight: "700", color: THEME.text, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: THEME.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  mainBtn: {
    backgroundColor: THEME.text,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  mainBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  toggleBtn: { marginTop: 20, alignItems: "center" },
  toggleText: { color: THEME.textMuted, fontSize: 14 },
  toggleLink: { color: THEME.primary, fontWeight: "700" },
});
