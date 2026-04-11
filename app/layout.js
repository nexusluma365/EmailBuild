import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Email Studio",
  description: "Build and send beautiful emails via Gmail",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
