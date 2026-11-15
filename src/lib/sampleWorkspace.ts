import {
  AgentMessage,
  ConsoleLogEntry,
  ExternalMcpBridgeConfig,
  GuardrailFailoverConfig,
  LlmEndpointConfig,
  McpServerStatus,
  ProjectMemoryDoc,
  ProviderCatalogEntry,
  ReSessionItem,
  ReSkillPreset,
  ReSpecialistAgent,
  ResourceGovernorConfig,
  WorkspaceFile,
} from "../types/workspace";

export const SAMPLE_FILES: WorkspaceFile[] = [
  {
    id: "frida-hook",
    name: "hook_native_sign.js",
    path: "frida/hook_native_sign.js",
    folderLabel: "Frida Scripts",
    category: "frida",
    language: "javascript",
    patchSummary:
      "กัน pointer null และอ่านความยาวบัฟเฟอร์จาก register x2 แทน readUtf8String(x1) เพื่อแก้ SIGSEGV",
    symbols: [
      {
        name: "Interceptor.attach(sub_14A80)",
        address: "libnative-sign.so+0x14A80",
        kind: "hook",
        xrefs: ["Java_com_target_security_SignInterceptor_nativeSign"],
        syncStatus: "synced",
      },
    ],
    content: `// DeepTrace Frida Instrumentation Script
// Target: com.target.app -> libnative-sign.so!sub_14A80

const MODULE_NAME = "libnative-sign.so";
const HMAC_OFFSET = 0x14a80;

function attachNativeSign() {
  const base = Module.findBaseAddress(MODULE_NAME);
  if (!base) {
    console.warn("[!] Waiting for " + MODULE_NAME + " to load...");
    return;
  }

  const targetAddr = base.add(HMAC_OFFSET);
  console.log("[+] Hooking sub_14A80 at " + targetAddr);

  Interceptor.attach(targetAddr, {
    onEnter(args) {
      this.payloadPtr = args[0];
      // BUG: args[1] is raw buffer pointer, NOT a null-terminated C string!
      this.rawPreview = Memory.readUtf8String(args[1]);
      console.log("[->] sub_14A80 payload:", this.rawPreview);
    },
    onLeave(retval) {
      if (!retval.isNull()) {
        console.log("[<-] Signature:", Memory.readCString(retval));
      }
    }
  });
}

setImmediate(attachNativeSign);`,
    modifiedContent: `// DeepTrace Frida Instrumentation Script (AI Patched)
// Target: com.target.app -> libnative-sign.so!sub_14A80

const MODULE_NAME = "libnative-sign.so";
const HMAC_OFFSET = 0x14a80;

function attachNativeSign() {
  const base = Module.findBaseAddress(MODULE_NAME);
  if (!base) {
    console.warn("[!] Waiting for " + MODULE_NAME + " to load...");
    return;
  }

  const targetAddr = base.add(HMAC_OFFSET);
  console.log("[+] Hooking sub_14A80 (compute_hmac_sha256_sig) at " + targetAddr);

  Interceptor.attach(targetAddr, {
    onEnter(args) {
      this.keyPtr = args[0];
      this.payloadPtr = args[1];
      this.payloadLen = args[2].toInt32();

      if (!this.payloadPtr.isNull() && this.payloadLen > 0 && this.payloadLen < 65536) {
        const bytes = Memory.readByteArray(this.payloadPtr, this.payloadLen);
        console.log("[->] sub_14A80 len=" + this.payloadLen + " hex:");
        console.log(hexdump(bytes, { length: Math.min(this.payloadLen, 64), header: false }));
      } else {
        console.warn("[!] Skipped invalid payload buffer len=" + this.payloadLen);
      }
    },
    onLeave(retval) {
      if (!retval.isNull()) {
        console.log("[<-] HMAC-SHA256 hex:", retval.readUtf8String());
      }
    }
  });
}

setImmediate(attachNativeSign);`,
  },
  {
    id: "native-c-jni",
    name: "Java_com_target_security_SignInterceptor_nativeSign.c",
    path: "native/libnative-sign.so/Java_com_target_security_SignInterceptor_nativeSign.c",
    folderLabel: "Native .so (Ghidra)",
    category: "native-c",
    language: "c",
    patchSummary:
      "เปลี่ยนชื่อสัญลักษณ์จาก Xrefs: FUN_00014a80 -> compute_hmac_sha256_sig และ param_3/4 -> nonce/payload",
    symbols: [
      {
        name: "Java_com_target_security_SignInterceptor_nativeSign",
        address: "0x00014720",
        kind: "jni",
        xrefs: ["SignInterceptor.nativeSign(String, byte[])"],
        syncStatus: "synced",
      },
      {
        name: "compute_hmac_sha256_sig (sub_14A80)",
        address: "0x00014A80",
        kind: "function",
        xrefs: ["0x000147B8", "0x00015204"],
        syncStatus: "pending",
      },
    ],
    content: `/* Decompiled by GhidraMCP — libnative-sign.so (arm64-v8a) */
#include <jni.h>
#include <stdint.h>

extern char* FUN_00014a80(const char* a1, const uint8_t* a2, int32_t a3);

jstring Java_com_target_security_SignInterceptor_nativeSign(
    JNIEnv* env,
    jobject thiz,
    jstring param_3,
    jbyteArray param_4)
{
    const char* sVar1;
    jbyte* pbVar2;
    jsize iVar3;
    char* pcVar4;
    jstring jVar5;

    if (param_3 == NULL || param_4 == NULL) {
        return NULL;
    }

    sVar1 = (*env)->GetStringUTFChars(env, param_3, NULL);
    iVar3 = (*env)->GetArrayLength(env, param_4);
    pbVar2 = (*env)->GetByteArrayElements(env, param_4, NULL);

    pcVar4 = FUN_00014a80(sVar1, (const uint8_t*)pbVar2, (int32_t)iVar3);

    (*env)->ReleaseByteArrayElements(env, param_4, pbVar2, 2);
    (*env)->ReleaseStringUTFChars(env, param_3, sVar1);

    jVar5 = (*env)->NewStringUTF(env, pcVar4);
    free(pcVar4);
    return jVar5;
}`,
    modifiedContent: `/* Decompiled by GhidraMCP — Symbol Sync Candidate */
#include <jni.h>
#include <stdint.h>

/* Renamed via DeepTrace AI: FUN_00014a80 -> compute_hmac_sha256_sig */
extern char* compute_hmac_sha256_sig(
    const char* nonce_str,
    const uint8_t* payload_bytes,
    int32_t payload_len
);

jstring Java_com_target_security_SignInterceptor_nativeSign(
    JNIEnv* env,
    jobject thiz,
    jstring nonce_jstr,
    jbyteArray payload_jbytes)
{
    if (nonce_jstr == NULL || payload_jbytes == NULL) {
        return NULL;
    }

    const char* nonce_cstr = (*env)->GetStringUTFChars(env, nonce_jstr, NULL);
    jsize payload_len = (*env)->GetArrayLength(env, payload_jbytes);
    jbyte* payload_buf = (*env)->GetByteArrayElements(env, payload_jbytes, NULL);

    /* Xref -> sub_14A80: derives XOR-masked key + HMAC-SHA256 hex digest */
    char* signature_hex = compute_hmac_sha256_sig(
        nonce_cstr,
        (const uint8_t*)payload_buf,
        (int32_t)payload_len
    );

    (*env)->ReleaseByteArrayElements(env, payload_jbytes, payload_buf, JNI_ABORT);
    (*env)->ReleaseStringUTFChars(env, nonce_jstr, nonce_cstr);

    jstring result_jstr = (*env)->NewStringUTF(env, signature_hex);
    free(signature_hex);
    return result_jstr;
}`,
  },
  {
    id: "native-arm64",
    name: "sub_14A80_hmac_sha256.arm64.s",
    path: "native/libnative-sign.so/sub_14A80_hmac_sha256.arm64.s",
    folderLabel: "Native .so (Ghidra)",
    category: "arm64",
    language: "arm64",
    symbols: [
      {
        name: "sub_14A80",
        address: "0x00014A80",
        kind: "export",
        xrefs: ["0x000147B8"],
        syncStatus: "pending",
      },
      {
        name: "EVP_MAC_CTX_new",
        address: "0x00031140 (PLT)",
        kind: "function",
        xrefs: ["0x00014AC4"],
        syncStatus: "synced",
      },
    ],
    content: `; libnative-sign.so :: sub_14A80 (compute_hmac_sha256_sig)
; Architecture: AArch64 (arm64-v8a)
; Args: X0 = const char* nonce_str, X1 = uint8_t* payload, W2 = int32_t payload_len

00014a80: STP   X29, X30, [SP, #-0x40]!
00014a84: MOV   X29, SP
00014a88: STP   X19, X20, [SP, #0x10]
00014a8c: STP   X21, X22, [SP, #0x20]
00014a90: MOV   X19, X0                 ; X19 = nonce_str
00014a94: MOV   X20, X1                 ; X20 = payload_bytes
00014a98: MOV   W21, W2                 ; W21 = payload_len
00014a9c: CBZ   X20, loc_14b34          ; Null check payload
00014aa0: CMP   W21, #0x0
00014aa4: B.LE  loc_14b34

; Load obfuscated static salt table (.rodata @ 0x00048200)
00014aa8: ADRP  X8, #0x48000
00014aac: ADD   X8, X8, #0x200
00014ab0: LDR   X9, [X8]
00014ab4: EOR   X9, X9, #0x5a5a         ; De-obfuscate key header
00014ab8: STR   X9, [SP, #0x30]

; Derive HMAC-SHA256 signature buffer
00014abc: MOV   X0, X19
00014ac0: MOV   X1, X20
00014ac4: BL    j_EVP_MAC_CTX_new
00014ac8: MOV   X22, X0
00014acc: CBZ   X22, loc_14b34
00014ad0: MOV   W0, W21
00014ad4: LSL   W0, W0, #0x1            ; Hex output length = payload_len * 2
00014ad8: BL    sub_14CE0               ; Format lowercase hex string
00014adc: LDP   X21, X22, [SP, #0x20]
00014ae0: LDP   X19, X20, [SP, #0x10]
00014ae4: LDP   X29, X30, [SP], #0x40
00014ae8: RET

loc_14b34:
00014b34: MOV   X0, XZR
00014b38: LDP   X21, X22, [SP, #0x20]
00014b3c: LDP   X19, X20, [SP, #0x10]
00014b40: LDP   X29, X30, [SP], #0x40
00014b44: RET`,
  },
  {
    id: "smali-sign",
    name: "SignInterceptor.smali",
    path: "smali/com/target/security/SignInterceptor.smali",
    folderLabel: "Java / Smali (JADX)",
    category: "smali",
    language: "smali",
    symbols: [
      {
        name: "SignInterceptor.signRequest",
        kind: "method",
        xrefs: ["CryptoManager.a(String, byte[])"],
        syncStatus: "synced",
      },
      {
        name: "SignInterceptor.nativeSign",
        kind: "jni",
        xrefs: ["0x00014720 (libnative-sign.so)"],
        syncStatus: "synced",
      },
    ],
    content: `.class public final Lcom/target/security/SignInterceptor;
.super Ljava/lang/Object;
.source "SignInterceptor.kt"

# direct methods
.method static constructor <clinit>()V
    .registers 1

    const-string v0, "native-sign"
    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V
    return-void
.end method

.method private final native nativeSign(Ljava/lang/String;[B)Ljava/lang/String;
.end method

.method public final signRequest(Ljava/lang/String;[B)Ljava/lang/String;
    .registers 5
    .param p1, "nonce"
    .param p2, "bodyBytes"

    .line 24
    const-string v0, "nonce"
    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->checkNotNullParameter(Ljava/lang/Object;Ljava/lang/String;)V

    .line 27
    invoke-direct {p0, p1, p2}, Lcom/target/security/SignInterceptor;->nativeSign(Ljava/lang/String;[B)Ljava/lang/String;
    move-result-object v1

    if-eqz v1, :cond_empty
    return-object v1

    :cond_empty
    const-string v0, ""
    return-object v0
.end method`,
  },
  {
    id: "java-crypto",
    name: "CryptoManager.java",
    path: "java/com/target/security/CryptoManager.java",
    folderLabel: "Java / Smali (JADX)",
    category: "java",
    language: "java",
    patchSummary:
      "เปลี่ยนชื่อเมธอดที่ถูก obfuscate: a(String, byte[]) -> buildRequestHeadersWithSig",
    symbols: [
      {
        name: "CryptoManager.a(String, byte[])",
        kind: "method",
        xrefs: ["ApiClient.sendSignedPost", "SignInterceptor.signRequest"],
        syncStatus: "pending",
      },
    ],
    content: `package com.target.security;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class CryptoManager {
    private final SignInterceptor b = new SignInterceptor();

    public Map<String, String> a(String str, byte[] bArr) {
        HashMap hashMap = new HashMap();
        String c = this.b.signRequest(str, bArr);
        hashMap.put("X-Nonce", str);
        hashMap.put("X-Sign-V2", c);
        return hashMap;
    }
}`,
    modifiedContent: `package com.target.security;

import java.util.HashMap;
import java.util.Map;

public final class CryptoManager {
    private final SignInterceptor signInterceptor = new SignInterceptor();

    /**
     * AI-inferred via jadx-ai-mcp: builds authenticated X-Nonce + X-Sign-V2 headers.
     */
    public Map<String, String> buildRequestHeadersWithSig(String nonce, byte[] bodyBytes) {
        HashMap<String, String> headers = new HashMap<>();
        String signatureHex = this.signInterceptor.signRequest(nonce, bodyBytes);
        headers.put("X-Nonce", nonce);
        headers.put("X-Sign-V2", signatureHex);
        return headers;
    }
}`,
  },
];

export const SAMPLE_MCP_SERVERS: McpServerStatus[] = [
  {
    id: "ghidra-mcp",
    name: "GhidraMCP",
    transport: "sse",
    status: "connected",
    enabled: true,
    toolsCount: 14,
    tokenCost: 1920,
    endpoint: "http://127.0.0.1:8080/sse",
    description: "Decompile .so (ARM64/x86), inspect Xrefs & sync symbol names",
    why: "ดึงเฉพาะฟังก์ชันและ Xrefs ปลายทางจาก .so โดยไม่ต้องโยนไฟล์ C ทั้งก้อนเข้า Context",
    group: "static",
  },
  {
    id: "jadx-ai-mcp",
    name: "jadx-ai-mcp",
    transport: "stdio",
    status: "connected",
    enabled: true,
    toolsCount: 18,
    tokenCost: 1840,
    endpoint: "jadx-mcp-server.exe",
    description: "Search APK classes, strings, Smali & Java sources on demand",
    why: "ค้นหา String/Class ใน DEX แบบ Index-first และส่งชื่อที่วิเคราะห์แล้วกลับเข้า JADX",
    group: "static",
  },
  {
    id: "re-local-mcp",
    name: "re-local-mcp",
    transport: "stdio",
    status: "connected",
    enabled: true,
    toolsCount: 9,
    tokenCost: 1060,
    endpoint: "python -m backend.mcp_servers.re_local_mcp",
    description: "ADB device bridge, Frida runner & 3-Hop Call-Graph Slicer",
    why: "รันสคริปต์ Frida/ADB จริงบนเครื่องแล้วส่ง stderr กลับมาวนแก้ Offset อัตโนมัติ",
    group: "dynamic",
  },
  {
    id: "unidbg-mcp",
    name: "unidbg-mcp",
    transport: "stdio",
    status: "disconnected",
    enabled: false,
    toolsCount: 7,
    tokenCost: 980,
    endpoint: "java -jar unidbg-mcp.jar",
    description: "Offline ARM64 JNI emulation without physical Android device",
    why: "จำลองรันฟังก์ชัน JNI sign/encrypt ใน .so บน PC เพื่อทดสอบ Input/Output แบบออฟไลน์",
    group: "dynamic",
  },
  {
    id: "radare2-mcp",
    name: "radare2-mcp",
    transport: "stdio",
    status: "disconnected",
    enabled: false,
    toolsCount: 11,
    tokenCost: 1240,
    endpoint: "r2pm -r r2mcp",
    description: "Binary hex patching, strings search & CFG disassembly",
    why: "แพตช์ Bytecode/Instruction ใน .so หรือตรวจเช็กตาราง PLT/GOT และ Strings ได้เร็ว",
    group: "static",
  },
  {
    id: "mitm-traffic-mcp",
    name: "mitm-traffic-mcp",
    transport: "sse",
    status: "disconnected",
    enabled: false,
    toolsCount: 8,
    tokenCost: 1150,
    endpoint: "http://127.0.0.1:8085/sse",
    description: "Parse captured HAR, mitmproxy flows & Protobuf schemas",
    why: "เทียบ Request จริงที่ดักได้กับฟังก์ชันสร้าง Signature ใน APK และสร้างบอท Python/PHP ต่อได้ทันที",
    group: "network",
  },
];

export const SAMPLE_RE_SKILLS: ReSkillPreset[] = [
  {
    id: "ssl-pinning-bypass",
    name: "ssl-pinning-bypass",
    category: "bypass",
    summary: "Frida multi-layer SSL pinning bypass (OkHttp3, TrustManager, BoringSSL, Flutter)",
    triggers: ["SSLHandshakeException", "CertificatePinner", "libflutter.so"],
    tokenCost: 420,
    enabled: true,
  },
  {
    id: "jni-register-natives",
    name: "jni-register-natives",
    category: "native",
    summary: "Hook RegisterNatives & art::JNI to dump dynamic native method offsets",
    triggers: ["JNI_OnLoad", "RegisterNatives", "UnsatisfiedLinkError"],
    tokenCost: 390,
    enabled: true,
  },
  {
    id: "ollvm-deobfuscator",
    name: "ollvm-deobfuscator",
    category: "native",
    summary: "Trace Control-Flow Flattening (BCF/CFF) dispatcher states in ARM64 .so",
    triggers: ["OLLVM", "switch dispatcher", "sub_"],
    tokenCost: 510,
    enabled: true,
  },
  {
    id: "anti-frida-bypass",
    name: "anti-frida-bypass",
    category: "bypass",
    summary: "Evade /proc/self/maps, port 27042, gum-js-loop & pthread_create checks",
    triggers: ["frida-server", "maps", "SIGKILL", "ptrace"],
    tokenCost: 460,
    enabled: false,
  },
  {
    id: "api-sign-reconstructor",
    name: "api-sign-reconstructor",
    category: "network",
    summary: "Correlate X-Sign / HMAC headers from APK crypto code into clean Python/PHP clients",
    triggers: ["X-Sign", "HMAC", "AES", "Protobuf"],
    tokenCost: 380,
    enabled: true,
  },
  {
    id: "il2cpp-dumper",
    name: "il2cpp-dumper",
    category: "game",
    summary: "Resolve Unity libil2cpp.so RVA offsets and global-metadata.dat symbols",
    triggers: ["libil2cpp.so", "global-metadata.dat"],
    tokenCost: 410,
    enabled: false,
  },
];

export const SAMPLE_SPECIALISTS: ReSpecialistAgent[] = [
  {
    id: "spec-dex",
    name: "DEX & Smali Analyst",
    role: "Static Java/Kotlin & Obfuscation Tracer",
    modelPreference: "gpt-4.1 (Cloud) / qwen2.5-coder",
    tools: ["jadx-ai-mcp", "re-local-mcp"],
    description:
      "ไล่หาจุดเริ่มต้นของ Request, Anti-Tamper, และคลาสที่ถูก ProGuard/R8 เปลี่ยนชื่อ พร้อมชี้ทางไปสู่ JNI",
    samplePrompt:
      "ค้นหาทุกจุดที่สร้าง header X-Sign-V2 ใน CryptoManager และไล่ไปยังคลาสที่เรียกใช้งานแบบ 3-Hop",
  },
  {
    id: "spec-native",
    name: "Native .so & ARM64 Surgeon",
    role: "Ghidra C Pseudocode & JNI Reverse Engineer",
    modelPreference: "qwen2.5-coder:32b (Local Ollama)",
    tools: ["GhidraMCP", "radare2-mcp", "unidbg-mcp"],
    description:
      "วิเคราะห์ฟังก์ชันใน .so แบบออฟไลน์ ถอดตรรกะ XOR/HMAC/AES และเสนอชื่อตัวแปรกลับเข้า Ghidra",
    samplePrompt:
      "วิเคราะห์ sub_14A80 ใน libnative-sign.so ระบุความหมายของ register X0-X2 และจุดเก็บ salt",
  },
  {
    id: "spec-frida",
    name: "Dynamic Frida & ADB Hunter",
    role: "Runtime Hook & Crash Loop Debugger",
    modelPreference: "qwen2.5-coder:32b (Local Ollama)",
    tools: ["re-local-mcp"],
    description:
      "เขียน Frida Interceptor/Stalker, รันผ่าน ADB, และจับ Error จาก logcat/stderr มาแก้ Offset ให้อัตโนมัติ",
    samplePrompt:
      "ตรวจสอบ crash access violation ใน hook_native_sign.js และสร้างแพตช์อ่าน byte array อย่างปลอดภัย",
  },
  {
    id: "spec-bot",
    name: "Crypto & API Bot Builder",
    role: "Algorithm Porting & Traffic Verification",
    modelPreference: "gpt-4.1 (Cloud)",
    tools: ["mitm-traffic-mcp", "jadx-ai-mcp", "GhidraMCP"],
    description:
      "ถอดอัลกอริทึม Sign/Encrypt ที่ยืนยันแล้วจาก APK + Native .so ออกมาเป็นสคริปต์ Python/PHP ที่รันทดสอบได้",
    samplePrompt:
      "สรุปขั้นตอนคำนวณ X-Sign-V2 จาก SignInterceptor และสร้างฟังก์ชัน Python ทดสอบเทียบกับค่าที่ Frida ดักได้",
  },
];

export const SAMPLE_MEMORY_DOCS: ProjectMemoryDoc[] = [
  {
    id: "mem-target",
    filename: "TARGET.md",
    title: "Target Architecture & Entrypoints",
    updatedAt: "วันนี้ 04:50",
    content: `# Target Profile: com.target.app (v4.2.1)

- **ABI**: arm64-v8a
- **Primary Native Lib**: \`lib/arm64-v8a/libnative-sign.so\`
- **Java Entrypoint**: \`com.target.security.CryptoManager.a(String, byte[])\` -> \`SignInterceptor.nativeSign(String, byte[])\`
- **Auth Headers**: \`X-Nonce\`, \`X-Sign-V2\`

## Decisions
- ห้ามส่งไฟล์ C decompile ทั้งไฟล์เข้า Prompt — ใช้ Smart Context Slicing 3-Hop เฉพาะจาก \`0x00014720\`
- ใช้ Local Ollama (\`qwen2.5-coder:32b\`) สำหรับโค้ด \`libnative-sign.so\` ทั้งหมด`,
  },
  {
    id: "mem-offsets",
    filename: "OFFSETS.md",
    title: "Verified Offsets & JNI Map",
    updatedAt: "วันนี้ 04:48",
    content: `# Verified Native Offsets (libnative-sign.so)

| Symbol | Offset | Calling Convention | Sync Status |
| :--- | :--- | :--- | :--- |
| \`Java_com_target_security_SignInterceptor_nativeSign\` | \`0x00014720\` | JNIEnv*, jobject, jstring, jbyteArray | Synced |
| \`compute_hmac_sha256_sig (sub_14A80)\` | \`0x00014A80\` | X0=nonce, X1=payload*, W2=len | Pending Ghidra Sync |
| \`.rodata static salt\` | \`0x00048200\` | XOR key header \`0x5a5a\` | Verified |`,
  },
  {
    id: "mem-crypto",
    filename: "CRYPTO_KEYS.md",
    title: "Signing Flow & Frida Findings",
    updatedAt: "วันนี้ 04:45",
    content: `# X-Sign-V2 Derivation Notes

1. Java sends \`nonce\` (UTF-8) + raw \`bodyBytes\` to \`nativeSign\`.
2. \`sub_14A80\` reads 8-byte header from \`.rodata @ 0x48200\`, XORs with \`0x5a5a\`.
3. Passes derived key + payload into \`EVP_MAC_CTX_new\` (HMAC-SHA256), formats lowercase hex via \`sub_14CE0\`.
4. **Frida Bug Note**: \`args[1]\` is NOT null-terminated; always read \`args[2].toInt32()\` bytes with \`Memory.readByteArray\`.`,
  },
  {
    id: "mem-playbook",
    filename: "PLAYBOOK.md",
    title: "RE Anti-Fumble Playbook (Auto-Learned)",
    updatedAt: "วันนี้ 04:40",
    content: `# RE Anti-Fumble Playbook

กฎที่ระบบเรียนรู้จากการทำงานจริงเพื่อลดการงมหาทางมั่วและประหยัด Token:

- ค้นหา Header Signature ใน JADX ด้วย String Xref ก่อนสแกนแพ็กเกจทั้งหมดเสมอ
- ก่อน Hook ฟังก์ชันใน .so ให้ตรวจสอบความยาวบัฟเฟอร์จาก Register ถัดไป (เช่น W2) ก่อนเรียก \`Memory.readUtf8String\``,
  },
];

export const SAMPLE_SESSIONS: ReSessionItem[] = [
  {
    id: "sess-1",
    title: "Trace X-Sign-V2 & Fix Frida Crash",
    target: "target_app_v4.2.1.apk",
    ago: "ตอนนี้",
    door: "assistant",
    status: "done",
  },
  {
    id: "sess-2",
    title: "ARM64 sub_14A80 Salt De-obfuscation",
    target: "libnative-sign.so",
    ago: "18 นาที",
    door: "workbench",
    status: "idle",
  },
  {
    id: "sess-3",
    title: "OkHttp3 CertificatePinner Audit",
    target: "target_app_v4.2.1.apk",
    ago: "เมื่อวาน",
    door: "assistant",
    status: "idle",
  },
];

export const SAMPLE_LLM_ENDPOINTS: LlmEndpointConfig[] = [
  {
    id: "auto-hybrid",
    name: "Auto-Route (Static -> Cloud, Binary -> Local)",
    provider: "ollama",
    baseUrl: "http://localhost:11434/v1",
    modelName: "qwen2.5-coder:32b",
    roleDescription: "Static Java/API to Cloud; sensitive .so/Frida to Local Ollama.",
    privacyLevel: "Local Offline",
    guardrailPolicy: "uncensored-local",
  },
  {
    id: "ollama-local",
    name: "Ollama Local (Binary Offline)",
    provider: "ollama",
    baseUrl: "http://localhost:11434/v1",
    modelName: "qwen2.5-coder:32b",
    roleDescription: "100% offline inference for .so pseudocode & keys.",
    privacyLevel: "Local Offline",
    guardrailPolicy: "uncensored-local",
  },
  {
    id: "lmstudio-local",
    name: "LM Studio Local (Deep Reasoning)",
    provider: "lmstudio",
    baseUrl: "http://localhost:1234/v1",
    modelName: "deepseek-r1-distill-qwen-32b",
    roleDescription: "Local chain-of-thought for obfuscated ARM64 control flow.",
    privacyLevel: "Local Offline",
    guardrailPolicy: "uncensored-local",
  },
  {
    id: "cloud-openai",
    name: "Cloud OpenAI / Anthropic (Strict Guardrail Test)",
    provider: "cloud",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4.1",
    roleDescription: "High-speed static APK mapping (auto-failovers if guardrail triggers).",
    privacyLevel: "Cloud API",
    guardrailPolicy: "strict-cloud",
  },
];

export const SAMPLE_PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "ollama",
    name: "Ollama (Local)",
    category: "local",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5-coder:7b-instruct-q4_K_M",
    models: [
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:32b",
      "deepseek-r1:8b",
    ],
    apiKeyConfigured: true,
    apiKeyHint: "ไม่ต้องใช้ API Key (รันในเครื่อง 100%)",
    guardrailPolicy: "uncensored-local",
    authGuide: "การ์ดจอ 4–8GB แนะนำ 7B-Q4 (ประหยัด VRAM) | 32B สำหรับ 20GB+",
    vramRequirement: "4–8GB VRAM (รุ่น 7B-Q4) / 20GB+ (รุ่น 32B)",
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    category: "local",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "qwen2.5-coder-7b-instruct",
    models: [
      "qwen2.5-coder-7b-instruct",
      "deepseek-r1-distill-qwen-7b",
      "deepseek-r1-distill-qwen-32b",
    ],
    apiKeyConfigured: true,
    apiKeyHint: "เปิด Local Server บนพอร์ต 1234",
    guardrailPolicy: "uncensored-local",
    authGuide: "โหลดโมเดล GGUF ระดับ 7B-Q4 สำหรับเครื่องการ์ดจอ 4–8GB",
    vramRequirement: "4–8GB VRAM (7B-Q4)",
  },
  {
    id: "vllm",
    name: "vLLM / llama.cpp Server",
    category: "local",
    baseUrl: "http://localhost:8000/v1",
    defaultModel: "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ",
    models: [
      "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ",
      "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ",
    ],
    apiKeyConfigured: false,
    apiKeyHint: "ใส่ค่าใดก็ได้หรือเว้นว่าง",
    guardrailPolicy: "uncensored-local",
    authGuide: "จำกัด --max-model-len และ GPU memory utilization ไม่ให้เครื่องค้าง",
    vramRequirement: "6–24GB VRAM (ขึ้นกับขนาดโมเดล)",
  },
  {
    id: "openrouter",
    name: "OpenRouter (Multi-Model Gateway)",
    category: "aggregator",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "deepseek/deepseek-r1",
    models: [
      "deepseek/deepseek-r1",
      "qwen/qwen-2.5-coder-32b-instruct",
      "anthropic/claude-sonnet-4",
    ],
    apiKeyConfigured: true,
    apiKeyHint: "sk-or-v1-...",
    guardrailPolicy: "re-friendly",
    authGuide: "คีย์เดียวเรียกได้ 300+ โมเดล (เหมาะกับเครื่องการ์ดจอ 4–8GB)",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot (OAuth)",
    category: "aggregator",
    baseUrl: "https://api.githubcopilot.com",
    defaultModel: "gpt-4.1",
    models: ["gpt-4.1", "claude-3.7-sonnet", "o4-mini"],
    apiKeyConfigured: false,
    apiKeyHint: "Sign in via GitHub Device Flow",
    guardrailPolicy: "strict-cloud",
    authGuide: "ล็อกอินด้วยบัญชี GitHub Copilot ที่มีอยู่ตามแบบ Aetox-Harness",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "codex",
    name: "ChatGPT / Codex Plan (OAuth)",
    category: "aggregator",
    baseUrl: "https://chatgpt.com/backend-api/codex",
    defaultModel: "gpt-5-codex",
    models: ["gpt-5-codex", "o4-mini"],
    apiKeyConfigured: false,
    apiKeyHint: "Sign in with ChatGPT Plus / Pro",
    guardrailPolicy: "strict-cloud",
    authGuide: "เชื่อมโควต้าบัญชี ChatGPT ได้โดยไม่ต้องจ่าย API แยก",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "cloud",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1",
    models: ["gpt-4.1", "o3", "o4-mini"],
    apiKeyConfigured: true,
    apiKeyHint: "sk-proj-...",
    guardrailPolicy: "strict-cloud",
    authGuide: "เหมาะกับวิเคราะห์โครงสร้าง APK ฝั่ง Java/Smali (แนะนำกดเปลี่ยน/รีเมื่อติดการ์ด)",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    category: "cloud",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    apiKeyConfigured: false,
    apiKeyHint: "sk-ant-...",
    guardrailPolicy: "strict-cloud",
    authGuide: "วางแผน Call Graph แม่นยำ ใช้คู่กับ Authorized Audit Framing",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    category: "cloud",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    apiKeyConfigured: false,
    apiKeyHint: "AIzaSy...",
    guardrailPolicy: "strict-cloud",
    authGuide: "Context Window ใหญ่ 1M+ สำหรับไล่ Dump ขนาดใหญ่",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    category: "cloud",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-reasoner",
    models: ["deepseek-reasoner", "deepseek-chat"],
    apiKeyConfigured: true,
    apiKeyHint: "sk-...",
    guardrailPolicy: "re-friendly",
    authGuide: "ราคาประหยัดมากและเก่ง C / Assembly / OLLVM (0GB VRAM)",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "groq",
    name: "Groq (Ultra-Fast)",
    category: "cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "qwen-qwq-32b",
    models: ["qwen-qwq-32b", "llama-3.3-70b-versatile"],
    apiKeyConfigured: false,
    apiKeyHint: "gsk_...",
    guardrailPolicy: "re-friendly",
    authGuide: "ความเร็ว Token สูงมาก เหมาะกับสแกนไฟล์ Smali จำนวนมาก",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    category: "cloud",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3",
    models: ["grok-3", "grok-3-mini"],
    apiKeyConfigured: false,
    apiKeyHint: "xai-...",
    guardrailPolicy: "re-friendly",
    authGuide: "ค่อนข้างยืดหยุ่นกับงานวิเคราะห์ Security & Binary",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud (Qwen)",
    category: "cloud",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-max",
    models: ["qwen-max", "qwen-coder-plus"],
    apiKeyConfigured: false,
    apiKeyHint: "sk-...",
    guardrailPolicy: "re-friendly",
    authGuide: "Qwen Coder Plus เก่งโค้ด Decompile และ Frida JS",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "kimi",
    name: "Moonshot Kimi",
    category: "cloud",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k2",
    models: ["kimi-k2", "moonshot-v1-128k"],
    apiKeyConfigured: false,
    apiKeyHint: "sk-...",
    guardrailPolicy: "re-friendly",
    authGuide: "รองรับ OpenAI-compatible เต็มรูปแบบ",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "thaillm",
    name: "ThaiLLM / Typhoon",
    category: "cloud",
    baseUrl: "https://api.opentyphoon.ai/v1",
    defaultModel: "typhoon-v2.1-12b-instruct",
    models: ["typhoon-v2.1-12b-instruct", "typhoon-v2-70b-instruct"],
    apiKeyConfigured: false,
    apiKeyHint: "sk-...",
    guardrailPolicy: "re-friendly",
    authGuide: "โมเดลภาษาไทยสำหรับสรุปรายงานและเอกสาร",
    vramRequirement: "ใช้การ์ดจอ 0 GB (รันบน Cloud 100%)",
  },
  {
    id: "openai-compatible",
    name: "Custom OpenAI-Compatible",
    category: "cloud",
    baseUrl: "https://your-gateway.example.com/v1",
    defaultModel: "custom-model",
    models: ["custom-model"],
    apiKeyConfigured: false,
    apiKeyHint: "Custom Bearer Token",
    guardrailPolicy: "re-friendly",
    authGuide: "เชื่อม LiteLLM, OneAPI, NewAPI หรือ Proxy ส่วนตัว",
    vramRequirement: "ใช้การ์ดจอ 0 GB (Remote API)",
  },
];

export const SAMPLE_FAILOVER_CONFIG: GuardrailFailoverConfig = {
  autoFailoverOnRefusal: false,
  neutralAuditFraming: true,
  fallbackProviderId: "deepseek",
  fallbackModelName: "deepseek-reasoner",
};

export const SAMPLE_RESOURCE_CONFIG: ResourceGovernorConfig = {
  mode: "eco-low-vram",
  maxCpuThreads: 4,
  maxRamMb: 1536,
  maxConcurrentMcpJobs: 1,
  consoleRingBufferLimit: 150,
  preferCloudForLowVram: true,
};

export const SAMPLE_EXTERNAL_MCP_BRIDGE: ExternalMcpBridgeConfig = {
  enabled: true,
  defaultProviderId: "anthropic",
  defaultModelName: "claude-sonnet-4-20250514",
  allowExternalSubtaskDelegation: true,
  requireApiKeyPreflight: true,
};

export const SAMPLE_AGENT_MESSAGES: AgentMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content:
      "ไล่เส้นทางการสร้าง X-Sign-V2 ตั้งแต่ Java ลงไปถึง libnative-sign.so แล้วช่วยแก้บั๊ก SIGSEGV ใน hook_native_sign.js ให้หน่อย",
    timestamp: "04:50:12",
    model: "user",
  },
  {
    id: "msg-2",
    role: "assistant",
    thinkingDurationSec: 1.8,
    content:
      "ไล่ Call Graph แบบ **3-Hop** จาก `CryptoManager.a()` → `SignInterceptor.nativeSign()` → `libnative-sign.so!sub_14A80` เรียบร้อยครับ\n\n" +
      "**สาเหตุที่ Frida Crash (`access violation`)**\n" +
      "ใน `sub_14A80(X0=nonce_str, X1=payload_bytes, W2=payload_len)` ตัว `args[1]` (`X1`) เป็น raw binary `jbyte*` ไม่ใช่ C string ที่มี null-terminator การเรียก `Memory.readUtf8String(args[1])` จึงอ่านเลยขอบเขตหน่วยความจำ\n\n" +
      "**สิ่งที่เตรียมไว้ให้ตรวจสอบใน Workbench ด้านขวา**\n" +
      "- เสนอ Diff แพตช์ใน `hook_native_sign.js` โดยอ่านขนาดจริงจาก `args[2].toInt32()` ผ่าน `Memory.readByteArray`\n" +
      "- เตรียม Sync ชื่อสัญลักษณ์ `FUN_00014a80` → `compute_hmac_sha256_sig` กลับเข้า `GhidraMCP`",
    timestamp: "04:50:19",
    model: "qwen2.5-coder:32b",
    routeKind: "local",
    reasoningSteps: [
      "ค้นหา X-Sign-V2 ผ่าน jadx-ai-mcp -> พบ CryptoManager.a() เรียก SignInterceptor.signRequest()",
      "ตัดบริบทแบบ 3-Hop Call Graph รอบ nativeSign(String, byte[]) แทนการโหลดทั้งไฟล์ (ประหยัด ~14,200 tokens)",
      "อ่าน decompile จาก GhidraMCP ที่ 0x14720 -> JNI wrapper ส่งต่อให้ FUN_00014a80(nonce, byteBuf, len)",
      "ตรวจ Prologue ARM64 ที่ 0x14A80: X0=nonce_str, X1=payload_bytes, W2=payload_len",
      "สร้างแพตช์ Frida และคิวเปลี่ยนชื่อสัญลักษณ์ใน Ghidra",
    ],
    toolCalls: [
      {
        id: "tc-1",
        server: "jadx-ai-mcp",
        toolName: "search_classes_by_keyword",
        args: '{ "query": "X-Sign-V2" }',
        resultPreview: "com.target.security.CryptoManager",
        durationMs: 42,
        status: "success",
        targetFileId: "java-crypto",
      },
      {
        id: "tc-2",
        server: "GhidraMCP",
        toolName: "decompile_function",
        args: '{ "address": "0x00014720", "depth": 3 }',
        resultPreview: "Java_..._nativeSign -> FUN_00014a80",
        durationMs: 118,
        status: "success",
        targetFileId: "native-c-jni",
      },
      {
        id: "tc-3",
        server: "re-local-mcp",
        toolName: "slice_call_graph",
        args: '{ "entry": "SignInterceptor.nativeSign", "hops": 3 }',
        resultPreview: "4 nodes, 128 lines (1,420 tokens)",
        durationMs: 29,
        status: "success",
        targetFileId: "native-arm64",
      },
    ],
    tokenUsage: {
      promptTokens: 1420,
      completionTokens: 386,
      sliceHops: 3,
    },
    learnedProposal: {
      id: "learn-1",
      scope: "project:target_app",
      scopeLabel: "โปรเจกต์ target_app",
      audience: "โหลดเฉพาะตอนเปิดโปรเจกต์นี้ · ประหยัด ~3,800 tokens ในรอบหน้า",
      ruleText:
        "sub_14A80 ใน libnative-sign.so รับ args[1]=jbyte* (ไม่ปิด null) และ args[2]=len เสมอ — ห้ามใช้ Memory.readUtf8String(args[1]) ให้ใช้ Memory.readByteArray(args[1], args[2].toInt32())",
      reason: "แก้ access violation ที่เกิดขึ้นซ้ำและข้ามการเดา register signature ในรอบถัดไป",
      tokensSavedEst: 3800,
      state: "pending",
    },
  },
];

export const SAMPLE_CONSOLE_LOGS: ConsoleLogEntry[] = [
  {
    id: "log-1",
    timestamp: "04:49:55",
    source: "adb",
    level: "info",
    text: "[adb] Connected device: Pixel_7_Pro_API_34 (127.0.0.1:5555) | ABI: arm64-v8a",
  },
  {
    id: "log-2",
    timestamp: "04:50:01",
    source: "frida",
    level: "info",
    text: "[frida] Attached to com.target.app (PID 19402) -> loaded hook_native_sign.js",
  },
  {
    id: "log-3",
    timestamp: "04:50:03",
    source: "frida",
    level: "error",
    text: "[frida][stderr] Error: access violation accessing 0x7a44012000 at Memory.readUtf8String (hook_native_sign.js:19)",
  },
  {
    id: "log-4",
    timestamp: "04:50:19",
    source: "mcp",
    level: "success",
    text: "[GhidraMCP] Decompiled 0x00014720 + 0x00014A80 (3-hop slice ready)",
  },
];
