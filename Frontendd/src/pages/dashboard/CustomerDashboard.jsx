"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import { Calendar, MapPin, Ticket } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import ConfirmationModal from "../../components/ui/confirmation-modal";

import CountdownTimer from "../../components/CountdownTimer";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CustomerDashboard() {
  const { user } = useAuth();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Upcoming Tickets");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState(null);

  const [searchParams] = useSearchParams();

  const ticketRefs = useRef({});
  const mountedRef = useRef(true);

  // =========================
  // Fetch Registrations
  // =========================
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/registrations/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok && mountedRef.current) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================
  // Fetch Events (optional tab)
  // =========================
  const fetchAvailableEvents = useCallback(async () => {
    try {
      setLoading(true);

      const tags = searchParams.get("tags");

      let url = `${API_BASE_URL}/api/events?status=approved`;
      if (tags) url += `&tags=${tags}`;

      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();

        const upcoming = (data.events || []).filter(
          (evt) => new Date(evt.date) >= new Date()
        );

        setRegistrations(upcoming);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // =========================
  // useEffect
  // =========================
  useEffect(() => {
    if (activeTab === "Browse Events") {
      fetchAvailableEvents();
    } else {
      fetchRegistrations();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [activeTab, fetchAvailableEvents, fetchRegistrations]);

  // =========================
  // Register
  // =========================
  const handleRegister = async (eventId) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/registrations/${eventId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Registered successfully");
        setActiveTab("Upcoming Tickets");
        fetchRegistrations();
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // Cancel Registration
  // =========================
  const handleCancelRegistration = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/registrations/${selectedRegistrationId}/cancel`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r._id === selectedRegistrationId
              ? { ...r, status: "cancelled" }
              : r
          )
        );
      }

      setIsModalOpen(false);
      setSelectedRegistrationId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // Download Ticket
  // =========================
  const handleDownloadTicket = async (ticket) => {
    try {
      const el = ticketRefs.current[ticket._id];
      if (!el) return;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("portrait", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);

      const pdfHeight =
        (imgProps.height * (pdfWidth - 20)) / imgProps.width;

      pdf.text("Event Ticket", 15, 15);

      pdf.addImage(
        imgData,
        "PNG",
        10,
        25,
        pdfWidth - 20,
        pdfHeight
      );

      const safeName = ticket.event?.title
        ?.replace(/\s+/g, "-")
        ?.replace(/[^a-zA-Z0-9-_]/g, "");

      pdf.save(
        `ticket-${safeName || "EVENT"}-${ticket._id.slice(-6)}.pdf`
      );
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // Filters
  // =========================
  const upcomingEvents = registrations.filter(
    (reg) =>
      reg.event &&
      reg.status !== "cancelled" &&
      new Date(reg.event.date) >= new Date()
  );

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen pt-32 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">
            Welcome, {user?.name || "User"}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b mb-8">
          {["Upcoming Tickets", "Past Events", "Browse Events"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 ${
                  activeTab === tab
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : "text-gray-400"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Tickets */}
        {activeTab === "Upcoming Tickets" && (
          <div className="space-y-6">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-20">
                <Ticket className="mx-auto w-10 h-10" />
                <p className="mt-4">No tickets found</p>

                <Button asChild className="mt-4">
                  <Link to="/#events">Browse Events</Link>
                </Button>
              </div>
            ) : (
              upcomingEvents.map((reg) => (
                <div
                  key={reg._id}
                  className="border rounded-xl p-4"
                >
                  {/* Ticket */}
                  <div
                    ref={(el) =>
                      (ticketRefs.current[reg._id] = el)
                    }
                    className="flex gap-4"
                  >
                    <div className="w-40 h-28 bg-gray-200 rounded" />

                    <div>
                      <h3 className="font-semibold">
                        {reg.event?.title}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {reg.event?.description}
                      </p>

                      <p className="text-xs mt-2">
                        <Calendar className="inline w-3 h-3" />{" "}
                        {new Date(
                          reg.event?.date
                        ).toLocaleDateString()}
                      </p>

                      {/* Countdown Timer */}
                      <div className="mt-2">
                        <CountdownTimer
                          eventDate={reg.event?.date}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() =>
                        handleDownloadTicket(reg)
                      }
                    >
                      Download
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRegistrationId(reg._id);
                        setIsModalOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal */}
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleCancelRegistration}
          title="Cancel Registration"
          description="Are you sure?"
        />
      </div>
    </div>
  );
}