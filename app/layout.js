import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Roll-Off | CSA Point Tracker",
  description: "Track FMCSA CSA violation points and when they roll off the record.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
