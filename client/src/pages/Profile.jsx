// client/src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import avatarDefault from "../assets/avatar.svg";
import axios from "../api/axiosConfig";
import {
  UserCircleIcon,
  LinkIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";

const ProfileField = ({ label, value }) => (
  <div>
    <dt className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 font-medium text-gray-800 dark:text-gray-200">
      {value || <span className="text-gray-400 dark:text-gray-500">Not provided</span>}
    </dd>
  </div>
);

const EditField = ({ label, name, value, onChange, placeholder, as = "input", type }) => {
  const commonProps = {
    name,
    value: value || "",
    onChange,
    placeholder,
    type,
    className:
      "block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm",
  };
  const Component = as;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
        {label}
      </label>
      <Component id={name} {...commonProps} />
    </div>
  );
};

export default function Profile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // avatar blob url + version to force reload
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  // cleanup blob on unmount/change
  useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    };
  }, [avatarUrl]);

  // Load profile
  useEffect(() => {
    if (!token) return;
    axios
      .get("/auth/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch(console.error);
  }, [token]);

  // Load avatar as blob (protected)
  useEffect(() => {
    if (!token || !profile?.avatar) {
      setAvatarUrl(null);
      return;
    }
    axios
      .get(`/auth/avatar/me?ts=${Date.now()}&v=${avatarVersion}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      .then((res) => {
        if (avatarUrl) URL.revokeObjectURL(avatarUrl);
        setAvatarUrl(URL.createObjectURL(res.data));
      })
      .catch((err) => {
        console.error("Failed to load avatar:", err);
        setAvatarUrl(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profile?.avatar, avatarVersion]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = () => {
  setIsSaving(true);
  const safeForm = { ...form };
  delete safeForm.avatar; // strip avatar before PATCH

  axios
    .patch("/auth/profile", safeForm, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      setProfile(res.data);
      setEditMode(false);
      setAvatarVersion((v) => v + 1);
    })
    .catch(console.error)
    .finally(() => setIsSaving(false));
};


  // Upload avatar (multipart)
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    axios
      .post("/auth/profile/avatar", fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        setProfile((prev) => ({ ...prev, avatar: res.data.avatar }));
        setAvatarVersion((v) => v + 1); // force reload new image
      })
      .catch((err) => console.error("Failed to upload avatar:", err));
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">Loading Profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 mb-8 shadow-lg shadow-indigo-500/20">
        <h1 className="text-3xl font-extrabold">Your Profile</h1>
        <p className="mt-1 text-white/80 max-w-2xl">
          Manage your personal information, account settings, and public presence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <section className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-center shadow-sm">
            <div className="relative inline-block">
              <img
                src={avatarUrl || avatarDefault}
                alt="Avatar"
                className="h-32 w-32 rounded-full object-cover mb-4 ring-4 ring-white dark:ring-gray-900 shadow-md"
              />
              {editMode && (
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 flex items-center justify-center h-10 w-10 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  <CameraIcon className="h-6 w-6" />
                  <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>

            <div className="mt-6">
              {editMode ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="h-5 w-5" />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold text-sm transition-colors duration-300 text-gray-900 dark:text-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition-colors duration-300 text-gray-900 dark:text-gray-100"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </section>
        </aside>

        {/* Right Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info Section */}
          <section className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <UserCircleIcon className="h-6 w-6 text-indigo-500" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Basic Information</h3>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              {editMode ? (
                <>
                  <EditField label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="Your Name" />
                  <EditField label="Gender" name="gender" value={form.gender} onChange={handleChange} placeholder="e.g., Male, Female, Other" />
                  <EditField label="Location" name="location" value={form.location} onChange={handleChange} placeholder="e.g., New York, USA" />
                  <EditField label="Birthday" name="birthday" value={form.birthday} onChange={handleChange} placeholder="YYYY-MM-DD" type="date" />
                  <div className="md:col-span-2">
                    <EditField label="Summary" name="summary" value={form.summary} onChange={handleChange} as="textarea" placeholder="A short bio about yourself..." />
                  </div>
                </>
              ) : (
                <>
                  <ProfileField label="Full Name" value={profile.name} />
                  <ProfileField label="Gender" value={profile.gender} />
                  <ProfileField label="Location" value={profile.location} />
                  <ProfileField label="Birthday" value={profile.birthday} />
                  <div className="md:col-span-2">
                    <ProfileField label="Summary" value={profile.summary} />
                  </div>
                </>
              )}
            </dl>
          </section>

          {/* Social Links Section */}
          <section className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <LinkIcon className="h-6 w-6 text-indigo-500" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Contact & Social</h3>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              {editMode ? (
                <>
                  <EditField label="Website" name="website" value={form.website} onChange={handleChange} placeholder="https://your-site.com" />
                  <EditField label="GitHub" name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/username" />
                  <EditField label="LinkedIn" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
                  <EditField label="Twitter" name="twitter" value={form.twitter} onChange={handleChange} placeholder="https://twitter.com/username" />
                </>
              ) : (
                <>
                  <ProfileField label="Website" value={profile.website} />
                  <ProfileField label="GitHub" value={profile.github} />
                  <ProfileField label="LinkedIn" value={profile.linkedin} />
                  <ProfileField label="Twitter" value={profile.twitter} />
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
