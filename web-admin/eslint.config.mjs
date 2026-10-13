import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design system guard (DESIGN_SYSTEM.md): chặn các kiểu cũ quay lại trong className và chuỗi giao diện
const DS_CLASS = "text-\\[(8|9|10|11)(\\.5)?px\\]|bg-gradient-to-|bg-linear-to-|font-(bold|extrabold|black)\\b|animate-(pulse|bounce|ping)|\\b(purple|violet|indigo|fuchsia|pink|cyan|sky|teal|orange)-\\d{2,3}";
// Chuyển động (DESIGN_SYSTEM.md §9): không phóng to khi rê chuột, không hiệu ứng nảy, không kéo dài quá 640ms
const MOTION_CLASS = "(group-)?hover:scale-|animate-bounce|duration-(500|700|1000)\\b|ease-in-out\\b";
const EMOJI ="[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2705}\\u{2728}\\u{274C}\\u{2B50}]";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Toàn bộ màn hình và thành phần đã chuyển sang design system: vi phạm là lỗi (error).
  {
    files: [
      "src/components/**/*.tsx",
      "src/app/**/*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${DS_CLASS}/]`,
          message: "Không dùng class ngoài design system (chữ < 12px, gradient, font-bold, hiệu ứng nhấp nháy, họ màu phụ). Xem DESIGN_SYSTEM.md.",
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${DS_CLASS}/]`,
          message: "Không dùng class ngoài design system (chữ < 12px, gradient, font-bold, hiệu ứng nhấp nháy, họ màu phụ). Xem DESIGN_SYSTEM.md.",
        },
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${MOTION_CLASS}/]`,
          message: "Chuyển động ngoài quy chuẩn (phóng to khi rê chuột, nảy, quá chậm, ease-in-out). Dùng token --motion-* / --ease-* và thành phần trong ui/motion. Xem DESIGN_SYSTEM.md §9.",
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${MOTION_CLASS}/]`,
          message: "Chuyển động ngoài quy chuẩn (phóng to khi rê chuột, nảy, quá chậm, ease-in-out). Dùng token --motion-* / --ease-* và thành phần trong ui/motion. Xem DESIGN_SYSTEM.md §9.",
        },
        {
          selector: `JSXText[value=/${EMOJI}/u]`,
          message: "Không dùng emoji trong giao diện. Dùng icon lucide-react. Xem DESIGN_SYSTEM.md.",
        },
        {
          selector: "CallExpression[callee.name=/^(alert|prompt|confirm)$/]",
          message: "Không dùng hộp thoại của trình duyệt. Dùng ConfirmDialog hoặc toast trong src/components/ui.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
