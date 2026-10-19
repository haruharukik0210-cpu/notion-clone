import { atom } from "jotai";

export type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" ? "dark" : "light";
}

export const themeAtom = atom<Theme>(getInitialTheme());