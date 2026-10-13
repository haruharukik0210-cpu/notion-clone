import { atom } from "jotai";
import { User } from "../users/user.entity";

export const currentUserAtom = atom<User>();

