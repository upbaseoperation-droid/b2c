import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design system guard (DESIGN_SYSTEM.md): chặn các kiểu cũ quay lại trong className và chuỗi giao diện
const DS_CLASS = "text-\\[(8|9|10|11)(\\.5)?px\\]|bg-gradient-to-|bg-linear-to-|font-(bold|extrabold|black)\\b|animate-(pulse|bounce|ping)|\\b(purple|violet|indigo|fuchsia|pink|cyan|sky|teal|orange)-\\d{2,3}";
const EMOJI = "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2705}\\u{2728}\\u{274C}\\u{2B50}]";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${DS_CLASS}/]`,
          message: "Không dùng class ngoài design system (chữ < 12px, gradient, font-bold, hiệu ứng nhấp nháy, họ màu phụ). Xem DESIGN_SYSTEM.md.",
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${DS_CLASS}/]`,
          message: "Không dùng class ngoài design system (chữ < 12px, gradient, font-bold, hiệu ứng nhấp nháy, họ màu phụ). Xem DESIGN_SYSTEM.md.",
        },
        {
          selector: `JSXText[value=/${EMOJI}/u]`,
          message: "Không dùng emoji trong giao diện. Dùng icon lucide-react. Xem DESIGN_SYSTEM.md.",
        },
      ],
    },
  },
  // Màn hình đã chuyển xong sang design system: vi phạm là lỗi, không phải cảnh báo.
  // Chuyển xong màn nào thì thêm file vào đây (DESIGN_SYSTEM.md §8).
  {
    files: [
      "src/components/ui/**/*.tsx",
      "src/components/TopHeader.tsx",
      "src/app/login/page.tsx",
      "src/components/views/BookingView.tsx",
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
