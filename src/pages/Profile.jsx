import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

function Profile({ user, setUser }) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    shopName: user?.shopName || '',
    gstin: user?.gstin || '',
    language: i18n.language,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedUser = { ...user, ...formData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    i18n.changeLanguage(formData.language);
    localStorage.setItem('language', formData.language);
    alert(t('success'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card">
          <h1 className="text-3xl font-bold mb-6 flex items-center space-x-2">
            <span>👤</span>
            <span>{t('profile')}</span>
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('email')}</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('shop_name')}</label>
                <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} className="w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} className="w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('language')}</label>
                <select name="language" value={formData.language} onChange={handleChange} className="w-full">
                  <option value="en">{t('english')}</option>
                  <option value="ta">{t('tamil')}</option>
                  <option value="hi">{t('hindi')}</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary py-3 px-8 rounded-lg">{t('save_changes')}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
