export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts}"
    ],
    theme: {
        extend: {
            colors: {
                primary: "#000000",
                secondary: "#737373",
                secondaryMute: "#EEEEEE",
                muted: "#7E7E7E",
                bgPrimary: "#ffffff",
                bgSecondary: "#F2F6FB",
            },
            fontFamily: {
                inter: ["Inter", "sans-serif"],
            },
        },
    },
    plugins: [],
}