import * as http from "http";

export class HttpUtil {
    static getClientIp(req: http.IncomingMessage) {
        var ipAddress;
        var forwardedIpsStr = req.headers['x-forwarded-for'] as string | undefined;
        if (forwardedIpsStr) {
            var forwardedIps = forwardedIpsStr.split(',');
            ipAddress = forwardedIps[0];
        }
        if (!ipAddress) {
            ipAddress = req.socket.remoteAddress;
        }
        return ipAddress ? ipAddress.replace(/^::ffff:/, '') : '';
    };
}