import { APP_ICON } from "@/data/constant";
import { NextApiRequest } from "next";
import { Session } from "next-auth";
import { getToken } from "next-auth/jwt";

export function getUserAvatar(session?:Session) {
    const src = session && session.user?.image != null ? session.user.image : APP_ICON;
    return src;
}

export async function isUserLoggedIn(req: NextApiRequest, session?: Session) {
    if (!session) {
        return {status:false}
    }
    const sessionToken = await getToken({ req, secret: process.env.COGNITO_CLIENT_SECRET })
    if (sessionToken === null || sessionToken === undefined || sessionToken.sub === undefined) {
        return {status:false};
    };
    return {status:true,id:sessionToken.sub};
}