/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                bg: {
                    app: '#09090b', // Zinc 950
                    panel: '#18181b', // Zinc 900
                    hover: '#27272a', // Zinc 800
                },
                border: {
                    DEFAULT: '#27272a', // Zinc 800
                    subtle: '#3f3f46', // Zinc 700
                },
                accent: {
                    primary: '#3b82f6', // Blue 500
                    dim: 'rgba(59, 130, 246, 0.1)',
                }
            }
        },
    },
    plugins: [],
}
