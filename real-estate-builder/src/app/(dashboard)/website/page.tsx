'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import PremiumButton from '@/components/premium-button';

interface Section {
  id: string;
  type: string;
  orderNo: number;
  configJson: any;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
}

interface MenuItem {
  id: string;
  title: string;
  url: string;
  orderNo: number;
}

interface NavigationMenu {
  id: string;
  name: string;
  items: MenuItem[];
}

interface AnimationPreset {
  id: string;
  name: string;
  type: string;
  duration: number;
  delay: number;
  easing: string;
}

export default function WebsiteArchitectPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'pages' | 'sections' | 'navigation' | 'branding'>('pages');
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Pages State
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedPageSections, setSelectedPageSections] = useState<Section[]>([]);
  const [showPageModal, setShowPageModal] = useState(false);
  const [pageForm, setPageForm] = useState({
    title: '',
    slug: '',
    status: 'draft' as 'draft' | 'published',
    seoTitle: '',
    seoDescription: '',
    template: 'luxury', // luxury, commercial, township, villa, blank
  });

  // 2. Sections Editor State
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [presets, setPresets] = useState<AnimationPreset[]>([]);

  // 3. Navigation Menus State
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    url: '',
  });

  // 4. Branding Theme State
  const [logo, setLogo] = useState('AETHELGARD');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#d4af37');
  const [secondaryColor, setSecondaryColor] = useState('#131313');
  const [fontHeader, setFontHeader] = useState('Bodoni Moda');
  const [fontBody, setFontBody] = useState('Hanken Grotesk');
  const [buttonStyle, setButtonStyle] = useState('square'); // rounded, square, pill
  const [cardStyle, setCardStyle] = useState('glass'); // glass, flat, shadow

  // Themes and Custom Layout States
  const [themes, setThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeForm, setThemeForm] = useState({
    name: '',
    logoText: 'AETHELGARD',
    logoUrl: '',
    primaryColor: '#d4af37',
    secondaryColor: '#131313',
    fontHeader: 'Bodoni Moda',
    fontBody: 'Hanken Grotesk',
    buttonStyle: 'square',
    cardStyle: 'glass',
    headerStyle: 'sticky',
    headerSocials: { whatsapp: '', phone: '', email: '' },
    footerCopyright: '© 2026. All Rights Reserved.',
    footerTagline: 'Bespoke Architectural landmarks',
    footerAddress: '121 Baker Street, London, UK',
    footerSocials: { facebook: '', instagram: '', linkedin: '', youtube: '' },
  });

  const [headerStyle, setHeaderStyle] = useState('sticky'); // sticky, floating, transparent
  const [headerSocials, setHeaderSocials] = useState({ whatsapp: '', phone: '', email: '' });
  const [footerCopyright, setFooterCopyright] = useState('© 2026. All Rights Reserved.');
  const [footerTagline, setFooterTagline] = useState('Bespoke Architectural landmarks');
  const [footerAddress, setFooterAddress] = useState('');
  const [footerSocials, setFooterSocials] = useState({ facebook: '', instagram: '', linkedin: '', youtube: '' });


  // 5. Drag & Drop & Live Viewport Simulator States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'inspector' | 'preview' | 'history' | 'components'>('inspector');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  // 6. Page Revisions States
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // 7. Component Library States
  const [libraryComponents, setLibraryComponents] = useState<any[]>([]);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [compForm, setCompForm] = useState({
    name: '',
    componentType: 'button',
    label: '',
    link: '',
    textContent: '',
  });

  const isSalesUser = user?.role === 'SALES_USER';
  const isBuilderStaff = user?.role === 'BUILDER_STAFF';

  const loadThemes = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/themes', {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Initial Configurations
  const loadBranding = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/builders/theme', {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.logo) setLogo(data.logo);
          if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl || '');
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
          if (data.fontHeader) setFontHeader(data.fontHeader);
          if (data.fontBody) setFontBody(data.fontBody);
          if (data.buttonStyle) setButtonStyle(data.buttonStyle);
          if (data.cardStyle) setCardStyle(data.cardStyle);
          if (data.headerStyle) setHeaderStyle(data.headerStyle);
          if (data.headerSocials) setHeaderSocials(data.headerSocials);
          if (data.footerCopyright) setFooterCopyright(data.footerCopyright);
          if (data.footerTagline) setFooterTagline(data.footerTagline);
          if (data.footerAddress !== undefined) setFooterAddress(data.footerAddress || '');
          if (data.footerSocials) setFooterSocials(data.footerSocials);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPages = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/pages', {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPages(data);
        if (data.length > 0 && !selectedPageId) {
          setSelectedPageId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch('http://localhost:3001/components/animations/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMenus = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/navigation/menus', {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMenus(data);
        if (data.length > 0 && !selectedMenuId) {
          setSelectedMenuId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPageSections = async (pageId: string) => {
    if (!token || !user?.tenantId || !pageId) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${pageId}`, {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPageSections(data.websiteSections || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadRevisions = async (pageId?: string) => {
    const targetPageId = pageId || selectedPageId;
    if (!token || !user?.tenantId || !targetPageId) return;
    setLoadingRevisions(true);
    try {
      const res = await fetch(`http://localhost:3001/pages/${targetPageId}/revisions`, {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const loadComponents = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/components', {
        headers: { 'x-tenant-id': user.tenantId, 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryComponents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadBranding(), loadThemes(), loadPages(), loadPresets(), loadMenus(), loadComponents()]);
      setLoading(false);
    };
    init();
  }, [token, user]);

  useEffect(() => {
    if (selectedPageId) {
      loadPageSections(selectedPageId);
      loadRevisions(selectedPageId);
      setSelectedSection(null);
    }
  }, [selectedPageId]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // 1. Pages Operations
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser || isBuilderStaff) return;
    try {
      const res = await fetch('http://localhost:3001/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(pageForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create page');
      }

      const newPage = await res.json();
      setPages([newPage, ...pages]);
      setSelectedPageId(newPage.id);
      setShowPageModal(false);
      setPageForm({
        title: '',
        slug: '',
        status: 'draft',
        seoTitle: '',
        seoDescription: '',
        template: 'luxury',
      });
      showSuccess(`Page "${newPage.title}" created successfully!`);
    } catch (err: any) {
      showError(err.message || 'Failed to create page');
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    if (isSalesUser || isBuilderStaff) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${pageId}/duplicate`, {
        method: 'POST',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const newPage = await res.json();
        setPages([newPage, ...pages]);
        setSelectedPageId(newPage.id);
        showSuccess(`Page duplicated as "${newPage.title}"`);
      }
    } catch (err) {
      showError('Failed to duplicate page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (isSalesUser || isBuilderStaff) return;
    if (!confirm('Are you sure you want to delete this page? This will delete all its sections.')) return;

    try {
      const res = await fetch(`http://localhost:3001/pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setPages(pages.filter((p) => p.id !== pageId));
        if (selectedPageId === pageId) {
          setSelectedPageId(pages[0]?.id || '');
        }
        showSuccess('Page deleted successfully');
      }
    } catch (err) {
      showError('Failed to delete page');
    }
  };

  const handleToggleStatus = async (page: Page) => {
    if (isSalesUser || isBuilderStaff) return;
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`http://localhost:3001/pages/${page.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setPages(pages.map((p) => (p.id === page.id ? { ...p, status: newStatus } : p)));
        showSuccess(`Page status updated to ${newStatus}`);
      }
    } catch (err) {
      showError('Failed to update status');
    }
  };

  // 2. Section Operations
  const handleAddSection = async (type: string) => {
    if (isSalesUser) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const newSec = await res.json();
        setSelectedPageSections([...selectedPageSections, newSec]);
        setShowAddSectionModal(false);
        showSuccess(`Section "${type.toUpperCase()}" added successfully`);
        await loadRevisions(selectedPageId);
      }
    } catch (err) {
      showError('Failed to add section');
    }
  };

  const handleUpdateSectionConfig = async (secId: string, updatedConfig: any) => {
    if (isSalesUser) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/sections/${secId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ configJson: updatedConfig }),
      });

      if (res.ok) {
        const saved = await res.json();
        setSelectedPageSections(
          selectedPageSections.map((s) => (s.id === secId ? { ...s, configJson: saved.configJson } : s))
        );
        setSelectedSection(null);
        showSuccess('Section configuration saved');
        await loadRevisions(selectedPageId);
      }
    } catch (err) {
      showError('Failed to update section config');
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (isSalesUser) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/sections/${secId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setSelectedPageSections(selectedPageSections.filter((s) => s.id !== secId));
        if (selectedSection?.id === secId) {
          setSelectedSection(null);
        }
        showSuccess('Section removed');
        await loadRevisions(selectedPageId);
      }
    } catch (err) {
      showError('Failed to delete section');
    }
  };

  const handleDuplicateSection = async (sec: Section) => {
    if (isSalesUser) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: sec.type,
          configJson: JSON.parse(JSON.stringify(sec.configJson)),
        }),
      });

      if (res.ok) {
        const newSec = await res.json();
        setSelectedPageSections([...selectedPageSections, newSec]);
        showSuccess('Section duplicated');
        await loadRevisions(selectedPageId);
      }
    } catch (err) {
      showError('Failed to duplicate section');
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (isSalesUser) return;
    const list = [...selectedPageSections];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const swapTarget = direction === 'up' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[swapTarget];
    list[swapTarget] = temp;

    setSelectedPageSections(list);

    // Save ordering to backend
    try {
      await fetch(`http://localhost:3001/pages/${selectedPageId}/sections/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sectionIds: list.map((s) => s.id) }),
      });
      await loadRevisions(selectedPageId);
    } catch (err) {
      showError('Failed to persist order');
    }
  };

  // 3. Navigation Operations
  const activeMenu = menus.find((m) => m.id === selectedMenuId);

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser || isBuilderStaff) return;
    try {
      const res = await fetch(`http://localhost:3001/navigation/menus/${selectedMenuId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemForm),
      });

      if (res.ok) {
        await loadMenus();
        setShowItemModal(false);
        setItemForm({ title: '', url: '' });
        showSuccess('Menu item added successfully');
      }
    } catch (err) {
      showError('Failed to add menu item');
    }
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser || isBuilderStaff || !editingItem) return;
    try {
      const res = await fetch(`http://localhost:3001/navigation/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemForm),
      });

      if (res.ok) {
        await loadMenus();
        setShowItemModal(false);
        setEditingItem(null);
        setItemForm({ title: '', url: '' });
        showSuccess('Menu item updated');
      }
    } catch (err) {
      showError('Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (isSalesUser || isBuilderStaff) return;
    if (!confirm('Are you sure you want to delete this link?')) return;
    try {
      const res = await fetch(`http://localhost:3001/navigation/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadMenus();
        showSuccess('Link removed');
      }
    } catch (err) {
      showError('Failed to delete menu item');
    }
  };

  const handleMoveMenuItem = async (index: number, direction: 'up' | 'down') => {
    if (isSalesUser || isBuilderStaff || !activeMenu) return;
    const itemsList = [...activeMenu.items];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === itemsList.length - 1) return;

    const swapTarget = direction === 'up' ? index - 1 : index + 1;
    const temp = itemsList[index];
    itemsList[index] = itemsList[swapTarget];
    itemsList[swapTarget] = temp;

    // Trigger reorder API
    try {
      const res = await fetch(`http://localhost:3001/navigation/menus/${selectedMenuId}/items/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itemIds: itemsList.map((i) => i.id) }),
      });

      if (res.ok) {
        await loadMenus();
      }
    } catch (err) {
      showError('Failed to reorder links');
    }
  };

  // 4. Branding Operations
  const handleSaveBranding = async () => {
    if (isSalesUser) return;
    try {
      const res = await fetch('http://localhost:3001/builders/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          logo,
          logoUrl,
          primaryColor,
          secondaryColor,
          fontHeader,
          fontBody,
          buttonStyle,
          cardStyle,
          headerStyle,
          headerSocials,
          footerCopyright,
          footerTagline,
          footerAddress,
          footerSocials,
        }),
      });

      if (res.ok) {
        showSuccess('Branding configurations updated successfully');
        await loadThemes();
      }
    } catch (err) {
      showError('Failed to save branding settings');
    }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser) return;
    try {
      const res = await fetch('http://localhost:3001/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(themeForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create theme');
      }

      const newTheme = await res.json();
      setThemes([...themes, newTheme]);
      setShowThemeModal(false);
      setThemeForm({
        name: '',
        logoText: 'AETHELGARD',
        logoUrl: '',
        primaryColor: '#d4af37',
        secondaryColor: '#131313',
        fontHeader: 'Bodoni Moda',
        fontBody: 'Hanken Grotesk',
        buttonStyle: 'square',
        cardStyle: 'glass',
        headerStyle: 'sticky',
        headerSocials: { whatsapp: '', phone: '', email: '' },
        footerCopyright: '© 2026. All Rights Reserved.',
        footerTagline: 'Bespoke Architectural landmarks',
        footerAddress: '121 Baker Street, London, UK',
        footerSocials: { facebook: '', instagram: '', linkedin: '', youtube: '' },
      });
      showSuccess(`Theme "${newTheme.name}" created successfully!`);
    } catch (err: any) {
      showError(err.message || 'Failed to create theme');
    }
  };

  const handleActivateTheme = async (themeId: string) => {
    if (isSalesUser || !themeId) return;
    try {
      const res = await fetch(`http://localhost:3001/themes/${themeId}/activate`, {
        method: 'POST',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        showSuccess('Theme activated successfully!');
        await loadBranding();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to activate theme');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to activate theme');
    }
  };

  // Drag and drop layout reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isSalesUser) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isSalesUser) return;
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    if (isSalesUser) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...selectedPageSections];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    const updatedList = list.map((item, idx) => ({
      ...item,
      orderNo: idx + 1
    }));

    setSelectedPageSections(updatedList);
    handleDragEnd();

    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/sections/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sectionIds: updatedList.map((s) => s.id) }),
      });
      if (res.ok) {
        showSuccess('Section reordered successfully');
        await loadRevisions(selectedPageId);
      } else {
        showError('Failed to save layout order');
      }
    } catch (err) {
      showError('Failed to persist section order');
    }
  };

  // Page revisions restoration
  const handleRestoreRevision = async (revisionId: string) => {
    if (isSalesUser || isBuilderStaff) return;
    if (!confirm('Are you sure you want to restore this layout snapshot? This will replace all current sections.')) return;
    try {
      const res = await fetch(`http://localhost:3001/pages/${selectedPageId}/revisions/${revisionId}/restore`, {
        method: 'POST',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const restored = await res.json();
        setSelectedPageSections(restored.websiteSections || []);
        setSelectedSection(null);
        showSuccess('Layout snapshot restored successfully!');
        await loadRevisions(selectedPageId);
      } else {
        const err = await res.json();
        showError(err.message || 'Failed to restore snapshot');
      }
    } catch (err) {
      showError('Failed to restore layout snapshot');
    }
  };

  // Reusable Component Library CRUD
  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser) return;
    try {
      const res = await fetch('http://localhost:3001/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          componentType: compForm.componentType,
          configJson: {
            name: compForm.name,
            label: compForm.label,
            link: compForm.link,
            textContent: compForm.textContent,
          }
        }),
      });

      if (res.ok) {
        await loadComponents();
        setShowCompModal(false);
        setCompForm({ name: '', componentType: 'button', label: '', link: '', textContent: '' });
        showSuccess('Library component created!');
      }
    } catch (err) {
      showError('Failed to create component');
    }
  };

  const handleUpdateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalesUser || !editingComponent) return;
    try {
      const res = await fetch(`http://localhost:3001/components/${editingComponent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          configJson: {
            name: compForm.name,
            label: compForm.label,
            link: compForm.link,
            textContent: compForm.textContent,
          }
        }),
      });

      if (res.ok) {
        await loadComponents();
        setShowCompModal(false);
        setEditingComponent(null);
        setCompForm({ name: '', componentType: 'button', label: '', link: '', textContent: '' });
        showSuccess('Library component updated!');
      }
    } catch (err) {
      showError('Failed to update component');
    }
  };

  const handleDeleteComponent = async (compId: string) => {
    if (isSalesUser) return;
    if (!confirm('Are you sure you want to delete this library component?')) return;
    try {
      const res = await fetch(`http://localhost:3001/components/${compId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadComponents();
        showSuccess('Component deleted');
      }
    } catch (err) {
      showError('Failed to delete component');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Visual Architect...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Website Visual Architect</h1>
          <p className="text-gray-500 text-sm mt-1">Design layout pages, configure dynamic content sections, customize menus, and branding.</p>
        </div>
        <div className="flex items-center gap-4">
          {successMsg && <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">{successMsg}</span>}
          {errorMsg && <span className="text-xs text-red-600 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">{errorMsg}</span>}
          {isSalesUser && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl border">READ ONLY ACCESS</span>}
          {isBuilderStaff && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">CONTENT WRITER</span>}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-150 mb-8 gap-1">
        <button
          onClick={() => setActiveTab('pages')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'pages' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
          }`}
        >
          📄 Pages Management
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'sections' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
          }`}
        >
          🧱 Section Layouts
        </button>
        <button
          onClick={() => setActiveTab('navigation')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'navigation' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
          }`}
        >
          ☰ Navigation Menus
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'branding' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
          }`}
        >
          🎨 Branding & Themes
        </button>
      </div>

      {/* --- TAB 1: PAGES --- */}
      {activeTab === 'pages' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Builder Site Pages</h3>
            <button
              disabled={isSalesUser || isBuilderStaff}
              onClick={() => setShowPageModal(true)}
              className="px-4.5 py-2.5 rounded-xl bg-gray-950 text-white hover:bg-gray-800 font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              + Create New Page
            </button>
          </div>

          {(isSalesUser || isBuilderStaff) && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-semibold">
              ℹ️ Creating, duplicating, deleting pages, or modifying page metadata is restricted to administrators. Staff can edit layout section details.
            </div>
          )}

          <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Page Name</th>
                  <th className="py-4 px-6">Relative Slug</th>
                  <th className="py-4 px-6">SEO Title</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {pages.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{p.title}</td>
                    <td className="py-4 px-6 font-mono text-gray-500">/{p.slug}</td>
                    <td className="py-4 px-6 text-gray-400 italic truncate max-w-xs">{p.seoTitle || 'Not Configured'}</td>
                    <td className="py-4 px-6">
                      <button
                        disabled={isSalesUser || isBuilderStaff}
                        onClick={() => handleToggleStatus(p)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                          p.status === 'published'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100/50'
                            : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100/50'
                        }`}
                      >
                        {p.status}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPageId(p.id);
                          setActiveTab('sections');
                        }}
                        className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-sm transition"
                      >
                        Design Layout
                      </button>
                      <button
                        disabled={isSalesUser || isBuilderStaff}
                        onClick={() => handleDuplicatePage(p.id)}
                        className="px-2.5 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-[10px] transition disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      {p.slug !== 'home' && (
                        <button
                          disabled={isSalesUser || isBuilderStaff}
                          onClick={() => handleDeletePage(p.id)}
                          className="px-2.5 py-1.5 rounded bg-white hover:bg-red-50 text-red-600 border border-gray-200 font-bold text-[10px] transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- TAB 2: SECTIONS LAYOUT --- */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-5 gap-8">
          {/* List of sections on the active page (Left Sidebar: 2 columns) */}
          <section className="col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Active Design Page</label>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (/{p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={isSalesUser}
                onClick={() => setShowAddSectionModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gray-950 text-white hover:bg-gray-800 font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                + Add Section
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {selectedPageSections.map((sec, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isSelected = selectedSection?.id === sec.id;
                
                return (
                  <div
                    key={sec.id}
                    draggable={!isSalesUser}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedSection(sec)}
                    className={`flex justify-between items-center p-4 border rounded-2xl cursor-grab active:cursor-grabbing transition-all duration-300 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/5 shadow-md scale-[1.01]'
                        : 'border-gray-200 bg-white hover:bg-gray-50/50'
                    } ${isDragging ? 'opacity-40 border-dashed border-gray-300' : ''} ${
                      isDragOver ? 'border-t-4 border-t-amber-500 pt-2 scale-[1.02]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex gap-2 items-center">
                        <span className="text-gray-400 font-bold text-xs select-none">☰</span>
                        <h4 className="text-sm font-bold text-gray-950 uppercase tracking-wider">{sec.type}</h4>
                      </div>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5 ml-5">Order Index: {sec.orderNo}</p>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveSection(index, 'up')}
                          disabled={index === 0 || isSalesUser}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 flex items-center justify-center font-bold text-[10px]"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveSection(index, 'down')}
                          disabled={index === selectedPageSections.length - 1 || isSalesUser}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 flex items-center justify-center font-bold text-[10px]"
                        >
                          ▼
                        </button>
                      </div>

                      <button
                        onClick={() => handleDuplicateSection(sec)}
                        disabled={isSalesUser}
                        className="px-1.5 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold text-[9px]"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        disabled={isSalesUser}
                        className="px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[9px]"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedPageSections.length === 0 && (
                <p className="text-center text-gray-400 py-10 text-xs italic">No content sections added to this page layout.</p>
              )}
            </div>
          </section>

          {/* Right Column: Visual Sub-Tabs Workspace (3 columns) */}
          <section className="col-span-3 flex flex-col gap-6">
            {/* Sub-tab selections */}
            <div className="flex border-b border-gray-150 gap-2">
              <button
                onClick={() => setWorkspaceSubTab('inspector')}
                className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  workspaceSubTab === 'inspector' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                📝 Inspector
              </button>
              <button
                onClick={() => setWorkspaceSubTab('preview')}
                className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  workspaceSubTab === 'preview' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                👁️ Live Preview
              </button>
              <button
                onClick={() => setWorkspaceSubTab('history')}
                className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  workspaceSubTab === 'history' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                ⌛ History
              </button>
              <button
                onClick={() => setWorkspaceSubTab('components')}
                className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  workspaceSubTab === 'components' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                🧱 Library
              </button>
            </div>

            {/* Sub-tab 1: INSPECTOR */}
            {workspaceSubTab === 'inspector' && (
              <>
                {selectedSection ? (
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                    <header className="border-b border-gray-100 pb-3 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Section Configuration</h4>
                        <h3 className="text-sm font-bold text-gray-950 mt-1 uppercase font-mono">{selectedSection.type} ({selectedSection.id.substring(0, 8)})</h3>
                      </div>
                      <button
                        onClick={() => setSelectedSection(null)}
                        className="text-gray-400 hover:text-gray-900 font-bold text-xs"
                      >
                        Close
                      </button>
                    </header>

                    {/* Shared components binding selector helper */}
                    {libraryComponents.length > 0 && (
                      <div className="bg-amber-50/60 border border-amber-100/80 p-3.5 rounded-xl text-[10px] space-y-1">
                        <span className="font-bold text-amber-800 uppercase tracking-wider block">Component Bind Helper</span>
                        <p className="text-gray-500">Need reusable settings? Copy properties from library component below:</p>
                        <select
                          onChange={(e) => {
                            const comp = libraryComponents.find((c) => c.id === e.target.value);
                            if (comp && comp.configJson) {
                              // Bind component properties to configuration
                              const newConfig = {
                                ...selectedSection.configJson,
                                buttonText: comp.configJson.label || selectedSection.configJson.buttonText,
                                buttonUrl: comp.configJson.link || selectedSection.configJson.buttonUrl,
                                title: comp.configJson.name || selectedSection.configJson.title,
                                description: comp.configJson.textContent || selectedSection.configJson.description,
                              };
                              setSelectedSection({ ...selectedSection, configJson: newConfig });
                              showSuccess('Copied properties from shared component!');
                            }
                          }}
                          className="w-full mt-1.5 px-3 py-1 bg-white border border-amber-200 rounded text-[10px] font-bold text-amber-900"
                        >
                          <option value="">-- Choose library component to apply --</option>
                          {libraryComponents.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.configJson?.name} ({c.componentType})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <SectionConfigForm
                      section={selectedSection}
                      presets={presets}
                      isReadOnly={isSalesUser}
                      onSave={(updatedConfig) => handleUpdateSectionConfig(selectedSection.id, updatedConfig)}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-250 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl">👈</span>
                    <h4 className="text-sm font-bold text-gray-900 mt-4">Select a Section Layout</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Click any section layout block in the list to configure its dynamic data variables, colors, or animations.</p>
                  </div>
                )}
              </>
            )}

            {/* Sub-tab 2: LIVE PREVIEW */}
            {workspaceSubTab === 'preview' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-150">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewViewport('desktop')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        previewViewport === 'desktop' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-400 hover:text-gray-950'
                      }`}
                    >
                      🖥️ Desktop
                    </button>
                    <button
                      onClick={() => setPreviewViewport('mobile')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        previewViewport === 'mobile' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-400 hover:text-gray-950'
                      }`}
                    >
                      📱 Mobile
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 truncate max-w-[200px]">
                    {pages.find(p => p.id === selectedPageId)?.slug || ''}
                  </div>
                </div>

                {/* Simulated browser frame */}
                <div className="bg-gray-950 rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
                  {/* macOS Dot headers */}
                  <div className="bg-neutral-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center gap-4">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                    </div>
                    <div className="flex-1 max-w-sm bg-neutral-950 text-stone-500 font-mono text-[9px] px-4 py-1.5 rounded-lg text-center truncate select-none border border-white/5">
                      https://{logo.toLowerCase().replace(/\s+/g, '')}.aether.com/{pages.find((p) => p.id === selectedPageId)?.slug || ''}
                    </div>
                    <div className="w-10"></div>
                  </div>

                  {/* Simulator content viewport */}
                  <div className="bg-neutral-950 p-2 flex justify-center items-start overflow-y-auto">
                    <div className={`transition-all duration-300 w-full ${previewViewport === 'mobile' ? 'max-w-[360px] border-x border-neutral-800 rounded-b-2xl shadow-2xl' : ''}`}>
                      <BuilderLivePreview
                        sections={selectedPageSections}
                        branding={{ logo, primaryColor, secondaryColor, fontHeader, fontBody, buttonStyle, cardStyle }}
                        selectedSectionId={selectedSection?.id}
                        onSelectSection={(sec) => {
                          setSelectedSection(sec);
                          setWorkspaceSubTab('inspector');
                        }}
                        viewport={previewViewport}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: REVISIONS HISTORY */}
            {workspaceSubTab === 'history' && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <header className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-serif">Page Revision snapshots</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Rollback layout configs, sections, and metadata to historical version snapshots.</p>
                </header>

                {loadingRevisions ? (
                  <div className="text-center py-6 text-xs text-gray-400">Loading version logs...</div>
                ) : revisions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-400 italic">No revisions captured yet. Make edits to create a snapshot.</div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="p-4 border border-gray-150 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition flex justify-between items-center gap-4">
                        <div>
                          <div className="flex gap-2 items-center">
                            <span className="bg-amber-500 text-stone-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded">v{rev.version}</span>
                            <span className="text-xs font-bold text-gray-900">{rev.title}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(rev.createdAt).toLocaleString()}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(rev.sectionsJson || []).map((s: any, idx: number) => (
                              <span key={idx} className="bg-gray-200/60 text-gray-600 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono">{s.type}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          disabled={isSalesUser || isBuilderStaff}
                          onClick={() => handleRestoreRevision(rev.id)}
                          className="px-3 py-1.5 rounded-lg bg-gray-950 text-white font-bold text-[10px] hover:bg-gray-800 shadow transition disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 4: COMPONENT LIBRARY */}
            {workspaceSubTab === 'components' && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <header className="border-b border-gray-150 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-serif">Component Library</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Manage shared custom widgets (Buttons, Banners) to bind inside layouts.</p>
                  </div>
                  <button
                    disabled={isSalesUser}
                    onClick={() => {
                      setEditingComponent(null);
                      setCompForm({ name: '', componentType: 'button', label: '', link: '', textContent: '' });
                      setShowCompModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gray-950 text-white hover:bg-gray-800 font-bold text-[10px] shadow transition disabled:opacity-50"
                  >
                    + Create Component
                  </button>
                </header>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {libraryComponents.map((comp) => {
                    const conf = comp.configJson || {};
                    return (
                      <div key={comp.id} className="p-4 border border-gray-150 rounded-xl bg-gray-50/50 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-gray-950">{conf.name || 'Unnamed Widget'}</h4>
                          <div className="flex gap-2 items-center mt-1 text-[9px]">
                            <span className="text-amber-500 font-bold uppercase tracking-wider">{comp.componentType}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 font-mono truncate max-w-[150px]">{conf.label || conf.textContent || conf.link || 'Empty properties'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingComponent(comp);
                              setCompForm({
                                name: conf.name || '',
                                componentType: comp.componentType,
                                label: conf.label || '',
                                link: conf.link || '',
                                textContent: conf.textContent || '',
                              });
                              setShowCompModal(true);
                            }}
                            className="px-2 py-1 rounded bg-white hover:bg-gray-50 border border-gray-250 font-bold text-[9px]"
                          >
                            Edit
                          </button>
                          <button
                            disabled={isSalesUser}
                            onClick={() => handleDeleteComponent(comp.id)}
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-[9px] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {libraryComponents.length === 0 && (
                    <p className="text-center text-gray-400 py-10 text-xs italic">No custom shared components created yet.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* --- TAB 3: NAVIGATION --- */}
      {activeTab === 'navigation' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Menu Container</label>
              <select
                value={selectedMenuId}
                onChange={(e) => setSelectedMenuId(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white focus:outline-none cursor-pointer"
              >
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} Menu
                  </option>
                ))}
              </select>
            </div>

            <button
              disabled={isSalesUser || isBuilderStaff}
              onClick={() => {
                setEditingItem(null);
                setItemForm({ title: '', url: '' });
                setShowItemModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gray-950 text-white hover:bg-gray-800 font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              + Add Navigation Link
            </button>
          </div>

          {(isSalesUser || isBuilderStaff) && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-semibold">
              ℹ️ Editing header/footer menu structures is restricted to administrators.
            </div>
          )}

          {activeMenu ? (
            <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="py-4 px-6 w-16">Order</th>
                    <th className="py-4 px-6">Link Title</th>
                    <th className="py-4 px-6">Redirection URL</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {activeMenu.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50/20 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveMenuItem(index, 'up')}
                            disabled={index === 0 || isSalesUser || isBuilderStaff}
                            className="w-5 h-5 rounded bg-gray-150 hover:bg-gray-250 text-gray-600 disabled:opacity-40 flex items-center justify-center font-bold text-[9px]"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveMenuItem(index, 'down')}
                            disabled={index === activeMenu.items.length - 1 || isSalesUser || isBuilderStaff}
                            className="w-5 h-5 rounded bg-gray-150 hover:bg-gray-250 text-gray-600 disabled:opacity-40 flex items-center justify-center font-bold text-[9px]"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-6 font-bold text-gray-900">{item.title}</td>
                      <td className="py-3 px-6 font-mono text-gray-400">{item.url}</td>
                      <td className="py-3 px-6 text-right space-x-2">
                        <button
                          disabled={isSalesUser || isBuilderStaff}
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({ title: item.title, url: item.url });
                            setShowItemModal(true);
                          }}
                          className="px-2 py-1 rounded bg-white hover:bg-gray-50 text-gray-600 border border-gray-250 font-bold text-[10px] transition disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          disabled={isSalesUser || isBuilderStaff}
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="px-2 py-1 rounded bg-white hover:bg-red-50 text-red-600 border border-gray-250 font-bold text-[10px] transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeMenu.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-10 text-xs italic">
                        No links in this menu folder.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10 text-xs italic">No menus synchronized.</p>
          )}
        </section>
      )}

      {/* --- TAB 4: BRANDING --- */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Active Theme Preset Manager */}
          <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Active Theme Preset</label>
              <div className="flex gap-2">
                <select
                  value={selectedThemeId}
                  onChange={(e) => setSelectedThemeId(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500 cursor-pointer font-bold text-gray-900"
                >
                  <option value="">-- Select Preset Theme --</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={isSalesUser || !selectedThemeId}
                  onClick={() => handleActivateTheme(selectedThemeId)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition disabled:opacity-50 shadow-sm"
                >
                  Activate Theme
                </button>
              </div>
            </div>
            <div className="flex items-end self-end md:self-auto">
              <button
                disabled={isSalesUser}
                onClick={() => {
                  setThemeForm({
                    name: 'Custom Luxury Theme',
                    logoText: logo,
                    logoUrl: logoUrl,
                    primaryColor: primaryColor,
                    secondaryColor: secondaryColor,
                    fontHeader: fontHeader,
                    fontBody: fontBody,
                    buttonStyle: buttonStyle,
                    cardStyle: cardStyle,
                    headerStyle: headerStyle,
                    headerSocials: { ...headerSocials },
                    footerCopyright: footerCopyright,
                    footerTagline: footerTagline,
                    footerAddress: footerAddress,
                    footerSocials: { ...footerSocials },
                  });
                  setShowThemeModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gray-950 text-white hover:bg-gray-800 font-bold text-xs shadow transition disabled:opacity-50"
              >
                + Create Custom Theme
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-8">
            <section className="col-span-3 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Branding & Layout Settings</h3>
                <p className="text-xs text-gray-400 mt-1">Configure company logos, custom style themes, dynamic navigation header layouts, and footer modules.</p>
              </div>
              
              <div className="flex flex-col gap-6 divide-y divide-gray-100">
                {/* 1. Core Brand Colors and Typography */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">1. Brand Identity & Typography</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Logo Text Title</label>
                      <input
                        type="text"
                        readOnly={isSalesUser}
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Logo Image URL</label>
                      <input
                        type="text"
                        placeholder="e.g. /branding/logo.png"
                        readOnly={isSalesUser}
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Primary Color (Hex/HSL)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          disabled={isSalesUser}
                          value={primaryColor.startsWith('#') ? primaryColor : '#d4af37'}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer disabled:opacity-50"
                        />
                        <input
                          type="text"
                          readOnly={isSalesUser}
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Secondary Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          disabled={isSalesUser}
                          value={secondaryColor.startsWith('#') ? secondaryColor : '#131313'}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer disabled:opacity-50"
                        />
                        <input
                          type="text"
                          readOnly={isSalesUser}
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Header Font Family</label>
                      <select
                        disabled={isSalesUser}
                        value={fontHeader}
                        onChange={(e) => setFontHeader(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-gray-900 font-bold"
                      >
                        <option value="Bodoni Moda">Bodoni Moda (Serif Luxury)</option>
                        <option value="Outfit">Outfit (Geometric Modern)</option>
                        <option value="Cinzel">Cinzel (Classic Roman)</option>
                        <option value="Playfair Display">Playfair Display (Premium Elegant)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Body Font Family</label>
                      <select
                        disabled={isSalesUser}
                        value={fontBody}
                        onChange={(e) => setFontBody(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-gray-900 font-bold"
                      >
                        <option value="Hanken Grotesk">Hanken Grotesk (Premium Geometric)</option>
                        <option value="Inter">Inter (Clean Minimal)</option>
                        <option value="Montserrat">Montserrat (Modern Sans)</option>
                        <option value="Lato">Lato (Warm Geometric)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Button Style</label>
                      <select
                        disabled={isSalesUser}
                        value={buttonStyle}
                        onChange={(e) => setButtonStyle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-gray-900 font-bold"
                      >
                        <option value="square">Square (Hard Edge)</option>
                        <option value="rounded">Rounded (Modern Corner)</option>
                        <option value="pill">Pill (Fluid Curve)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Card Box Style</label>
                      <select
                        disabled={isSalesUser}
                        value={cardStyle}
                        onChange={(e) => setCardStyle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-gray-900 font-bold"
                      >
                        <option value="glass">Glassmorphism (Frosted Transparent)</option>
                        <option value="flat">Flat Matte (Clean Solid)</option>
                        <option value="shadow">Shadow (Floating Elevation)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Header Style & Configurations */}
                <div className="space-y-4 pt-6">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">2. Navigation Header Config</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Header Layout Style</label>
                    <select
                      disabled={isSalesUser}
                      value={headerStyle}
                      onChange={(e) => setHeaderStyle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-gray-900 font-bold"
                    >
                      <option value="sticky">Sticky Navbar (Locks to screen top)</option>
                      <option value="floating">Floating Pill (Detached premium capsule with shadow)</option>
                      <option value="transparent">Transparent Over-Hero (Blends with backdrop image)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">WhatsApp Redirect Link</label>
                      <input
                        type="text"
                        placeholder="https://wa.me/..."
                        readOnly={isSalesUser}
                        value={headerSocials.whatsapp || ''}
                        onChange={(e) => setHeaderSocials({ ...headerSocials, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Phone Contact No.</label>
                      <input
                        type="text"
                        placeholder="+1 (555) 000-0000"
                        readOnly={isSalesUser}
                        value={headerSocials.phone || ''}
                        onChange={(e) => setHeaderSocials({ ...headerSocials, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="concierge@aether.com"
                        readOnly={isSalesUser}
                        value={headerSocials.email || ''}
                        onChange={(e) => setHeaderSocials({ ...headerSocials, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Footer branding and metadata */}
                <div className="space-y-4 pt-6">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">3. Footer Module Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Brand Tagline</label>
                      <input
                        type="text"
                        placeholder="Bespoke Architectural landmarks"
                        readOnly={isSalesUser}
                        value={footerTagline}
                        onChange={(e) => setFooterTagline(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Copyright Note</label>
                      <input
                        type="text"
                        placeholder="© 2026. All Rights Reserved."
                        readOnly={isSalesUser}
                        value={footerCopyright}
                        onChange={(e) => setFooterCopyright(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Physical Address</label>
                    <textarea
                      placeholder="121 Baker Street, London, UK"
                      readOnly={isSalesUser}
                      rows={2}
                      value={footerAddress}
                      onChange={(e) => setFooterAddress(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 resize-none text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">Facebook URL</label>
                      <input
                        type="text"
                        placeholder="https://facebook.com/..."
                        readOnly={isSalesUser}
                        value={footerSocials.facebook || ''}
                        onChange={(e) => setFooterSocials({ ...footerSocials, facebook: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">Instagram URL</label>
                      <input
                        type="text"
                        placeholder="https://instagram.com/..."
                        readOnly={isSalesUser}
                        value={footerSocials.instagram || ''}
                        onChange={(e) => setFooterSocials({ ...footerSocials, instagram: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">LinkedIn URL</label>
                      <input
                        type="text"
                        placeholder="https://linkedin.com/..."
                        readOnly={isSalesUser}
                        value={footerSocials.linkedin || ''}
                        onChange={(e) => setFooterSocials({ ...footerSocials, linkedin: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">YouTube URL</label>
                      <input
                        type="text"
                        placeholder="https://youtube.com/..."
                        readOnly={isSalesUser}
                        value={footerSocials.youtube || ''}
                        onChange={(e) => setFooterSocials({ ...footerSocials, youtube: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-amber-500 text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 flex justify-end">
                  <PremiumButton
                    variant="primary"
                    onClick={handleSaveBranding}
                    disabled={isSalesUser}
                  >
                    Save Branding & Layout Configs
                  </PremiumButton>
                </div>
              </div>
            </section>

            {/* Simulated Live Theme Preview */}
            <section className="col-span-2 flex flex-col gap-6">
              <div className="bg-neutral-950 text-stone-200 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[520px] border border-neutral-800">
                {/* Header Simulator Panel */}
                <div className="space-y-4">
                  <span className="text-[8px] font-mono tracking-widest uppercase text-stone-500 block">Header Style Simulation: {headerStyle.toUpperCase()}</span>
                  
                  {/* Outer Wrapper for simulating Sticky/Floating/Transparent */}
                  <div className={`transition-all duration-350 p-3 flex justify-between items-center ${
                    headerStyle === 'floating'
                      ? 'bg-neutral-900/95 border border-white/10 rounded-2xl shadow-lg mx-1 my-2 backdrop-blur'
                      : headerStyle === 'transparent'
                      ? 'bg-transparent border-b border-white/5 my-0 py-4'
                      : 'bg-neutral-900 border-b border-white/10 rounded-none my-0 py-4'
                  }`}>
                    <div className="flex items-center gap-2">
                      {logoUrl ? (
                        <div className="h-4.5 px-2 bg-neutral-800/80 border border-white/10 rounded flex items-center justify-center text-[7px] text-stone-400">Logo Img</div>
                      ) : (
                        <span className="text-xs font-bold tracking-wider" style={{ color: primaryColor, fontFamily: `${fontHeader}, serif` }}>
                          {logo}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2.5 text-[8px] font-bold text-stone-400 uppercase">
                      <span>Home</span>
                      <span>About</span>
                      <span>Contact</span>
                    </div>
                    {/* Header Social Mini Preview */}
                    <div className="flex gap-1.5 text-[8px] text-[var(--primary-color)]">
                      {headerSocials.whatsapp && <span>💬</span>}
                      {headerSocials.phone && <span>📞</span>}
                      {headerSocials.email && <span>✉️</span>}
                    </div>
                  </div>

                  {/* Sample content page */}
                  <div className="mt-6 space-y-3 px-1">
                    <h2 className="text-xl font-light leading-snug" style={{ fontFamily: `${fontHeader}, serif` }}>
                      Experience <span style={{ color: primaryColor }} className="italic">Luxury Living</span>
                    </h2>
                    <p className="text-[9px] text-stone-400 leading-relaxed" style={{ fontFamily: `${fontBody}, sans-serif` }}>
                      Bespoke architecture configured with custom parameters, responsive layout grid structures, and dynamic themes.
                    </p>
                  </div>
                </div>

                {/* Button / Card preview panel */}
                <div className="my-6 px-1 space-y-4">
                  <div className="flex gap-3 items-center">
                    <button
                      className={`px-4 py-2 font-bold text-[8px] tracking-wider uppercase text-neutral-950 transition-all ${
                        buttonStyle === 'pill' ? 'rounded-full' : buttonStyle === 'rounded' ? 'rounded-lg' : 'rounded-none'
                      }`}
                      style={{ backgroundColor: primaryColor }}
                    >
                      Action Button
                    </button>

                    <div
                      className={`flex-1 p-3 text-[8px] border border-white/5 ${
                        cardStyle === 'glass'
                          ? 'bg-white/5 backdrop-blur-md'
                          : cardStyle === 'shadow'
                          ? 'bg-neutral-900 shadow-md border border-white/10'
                          : 'bg-neutral-900 border-none'
                      } ${buttonStyle === 'pill' ? 'rounded-2xl' : buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-none'}`}
                    >
                      <span className="block font-bold">Featured Suite</span>
                      <span className="text-stone-500 block text-[7px] mt-0.5">Custom visual cards style.</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Footer Panel */}
                <div className="border-t border-white/10 pt-4 mt-auto space-y-2 px-1 text-stone-400 text-[8px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-stone-200 block text-[9px] uppercase tracking-wider">{logo}</span>
                      <span className="text-stone-500 text-[7px] italic block mt-0.5">{footerTagline}</span>
                    </div>
                    {/* Social Redirect Icons */}
                    <div className="flex gap-2">
                      {footerSocials.facebook && <span className="opacity-60 hover:opacity-100 cursor-pointer">FB</span>}
                      {footerSocials.instagram && <span className="opacity-60 hover:opacity-100 cursor-pointer">IG</span>}
                      {footerSocials.linkedin && <span className="opacity-60 hover:opacity-100 cursor-pointer">LN</span>}
                      {footerSocials.youtube && <span className="opacity-60 hover:opacity-100 cursor-pointer">YT</span>}
                    </div>
                  </div>
                  {footerAddress && (
                    <p className="text-stone-500 text-[7px] border-t border-white/5 pt-1.5">{footerAddress}</p>
                  )}
                  <p className="text-[7px] text-stone-600 pt-1">{footerCopyright}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* --- CREATE PAGE MODAL --- */}
      {showPageModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">Create New Page</h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Deploy a new layout route to the public web client.</p>

            <form onSubmit={handleCreatePage} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Page Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Penthouse"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">URL Route Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. penthouse-view"
                  value={pageForm.slug}
                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Select Default Template</label>
                <select
                  value={pageForm.template}
                  onChange={(e) => setPageForm({ ...pageForm, template: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="luxury">Luxury Builder (Hero, Concept, Gallery, Amenities, CTA, Contact)</option>
                  <option value="commercial">Commercial Space (Hero, Corporate Features, Amenities, Contact)</option>
                  <option value="township">Township Development (Hero, Community Features, Contact)</option>
                  <option value="villa">Signature Villa (Hero, Estate Features, Testimonials, Contact)</option>
                  <option value="">Blank Page (No pre-set sections)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-stone-800 pt-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    placeholder="Search engine title tag"
                    value={pageForm.seoTitle}
                    onChange={(e) => setPageForm({ ...pageForm, seoTitle: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">SEO Meta Description</label>
                  <input
                    type="text"
                    placeholder="Search engine snippet"
                    value={pageForm.seoDescription}
                    onChange={(e) => setPageForm({ ...pageForm, seoDescription: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowPageModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs hover:from-amber-400 transition"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD SECTION MODAL --- */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">Add Section Layout</h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Select a structured layout block to add to the page.</p>

            <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {[
                { type: 'hero', name: 'Cinematic Hero Banner' },
                { type: 'features', name: 'Concept & Feature Grid' },
                { type: 'gallery', name: 'Multi-Image Slider/Grid' },
                { type: 'amenities', name: 'Amenities List' },
                { type: 'testimonials', name: 'Testimonials Carousel' },
                { type: 'cta', name: 'Call To Action Banner' },
                { type: 'contact', name: 'Booking Lead Form' },
                { type: 'video', name: 'Walkthrough Video Frame' },
                { type: 'virtual-tour', name: 'Virtual 3D Tour Embed' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddSection(item.type)}
                  className="p-4 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-2xl text-left transition active:scale-95 flex flex-col justify-between min-h-[90px]"
                >
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{item.type}</span>
                  <span className="text-[10px] text-stone-400 block mt-1">{item.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MENU ITEM MODAL --- */}
      {showItemModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">
              {editingItem ? 'Edit Menu Link' : 'Add Menu Link'}
            </h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Configure link redirects.</p>

            <form onSubmit={editingItem ? handleUpdateMenuItem : handleAddMenuItem} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Link Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gallery"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Redirection Target URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /gallery or https://google.com"
                  value={itemForm.url}
                  onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowItemModal(false); setEditingItem(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs hover:from-amber-400 transition"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- COMPONENT LIBRARY MODAL --- */}
      {showCompModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">
              {editingComponent ? 'Edit Library Component' : 'Create Library Component'}
            </h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Define reusable components to bind into layouts.</p>

            <form onSubmit={editingComponent ? handleUpdateComponent : handleCreateComponent} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call to Action Button"
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Component Type</label>
                <select
                  disabled={!!editingComponent}
                  value={compForm.componentType}
                  onChange={(e) => setCompForm({ ...compForm, componentType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-stone-950"
                >
                  <option value="button">Button Link Widget</option>
                  <option value="text">Custom Text Paragraph</option>
                  <option value="card">Info Content Card</option>
                </select>
              </div>

              {compForm.componentType === 'button' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Button Label (Text)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Book Visit"
                      value={compForm.label}
                      onChange={(e) => setCompForm({ ...compForm, label: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Redirection Link (URL)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. #contact"
                      value={compForm.link}
                      onChange={(e) => setCompForm({ ...compForm, link: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {compForm.componentType === 'text' && (
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Content Text</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter custom text content..."
                    value={compForm.textContent}
                    onChange={(e) => setCompForm({ ...compForm, textContent: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              )}

              {compForm.componentType === 'card' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Card Header (Label)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Skyline Lounge"
                      value={compForm.label}
                      onChange={(e) => setCompForm({ ...compForm, label: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Card Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter description..."
                      value={compForm.textContent}
                      onChange={(e) => setCompForm({ ...compForm, textContent: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowCompModal(false); setEditingComponent(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs hover:from-amber-400 transition"
                >
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE THEME MODAL --- */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">Create Theme Preset</h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Design a custom styled brand preset theme package.</p>

            <form onSubmit={handleCreateTheme} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Preset Theme Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Slate Luxury"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Logo Text</label>
                  <input
                    type="text"
                    required
                    value={themeForm.logoText}
                    onChange={(e) => setThemeForm({ ...themeForm, logoText: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Logo Image URL</label>
                  <input
                    type="text"
                    value={themeForm.logoUrl}
                    onChange={(e) => setThemeForm({ ...themeForm, logoUrl: e.target.value })}
                    placeholder="e.g. /logo.png"
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Primary Color</label>
                  <input
                    type="text"
                    required
                    value={themeForm.primaryColor}
                    onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Secondary Color</label>
                  <input
                    type="text"
                    required
                    value={themeForm.secondaryColor}
                    onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Header Font</label>
                  <select
                    value={themeForm.fontHeader}
                    onChange={(e) => setThemeForm({ ...themeForm, fontHeader: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-stone-950"
                  >
                    <option value="Bodoni Moda">Bodoni Moda (Serif Luxury)</option>
                    <option value="Outfit">Outfit (Geometric Modern)</option>
                    <option value="Cinzel">Cinzel (Classic Roman)</option>
                    <option value="Playfair Display">Playfair Display (Premium Elegant)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Body Font</label>
                  <select
                    value={themeForm.fontBody}
                    onChange={(e) => setThemeForm({ ...themeForm, fontBody: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-stone-950"
                  >
                    <option value="Hanken Grotesk">Hanken Grotesk (Premium Geometric)</option>
                    <option value="Inter">Inter (Clean Minimal)</option>
                    <option value="Montserrat">Montserrat (Modern Sans)</option>
                    <option value="Lato">Lato (Warm Geometric)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Button corners</label>
                  <select
                    value={themeForm.buttonStyle}
                    onChange={(e) => setThemeForm({ ...themeForm, buttonStyle: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-stone-950"
                  >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Card Box style</label>
                  <select
                    value={themeForm.cardStyle}
                    onChange={(e) => setThemeForm({ ...themeForm, cardStyle: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-stone-950"
                  >
                    <option value="glass">Glassmorphism</option>
                    <option value="flat">Flat Matte</option>
                    <option value="shadow">Shadow</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-stone-800 pt-4 space-y-4">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Header & Footer Layouts</span>
                <div>
                  <label className="text-[9px] font-bold text-stone-500 block mb-1">Header Style</label>
                  <select
                    value={themeForm.headerStyle}
                    onChange={(e) => setThemeForm({ ...themeForm, headerStyle: e.target.value })}
                    className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none bg-stone-950"
                  >
                    <option value="sticky">Sticky Navbar</option>
                    <option value="floating">Floating Pill</option>
                    <option value="transparent">Transparent Over-Hero</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-stone-500 block mb-1">Footer Tagline</label>
                    <input
                      type="text"
                      value={themeForm.footerTagline}
                      onChange={(e) => setThemeForm({ ...themeForm, footerTagline: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-stone-500 block mb-1">Footer Copyright</label>
                    <input
                      type="text"
                      value={themeForm.footerCopyright}
                      onChange={(e) => setThemeForm({ ...themeForm, footerCopyright: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-stone-500 block mb-1">Physical Address</label>
                  <textarea
                    value={themeForm.footerAddress}
                    onChange={(e) => setThemeForm({ ...themeForm, footerAddress: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowThemeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs hover:from-amber-400 transition"
                >
                  Create Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Live Browser Viewport Preview Frame
interface BuilderLivePreviewProps {
  sections: Section[];
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontHeader: string;
    fontBody: string;
    buttonStyle: string;
    cardStyle: string;
  };
  selectedSectionId?: string;
  onSelectSection: (sec: Section) => void;
  viewport: 'desktop' | 'mobile';
}

function BuilderLivePreview({ sections, branding, selectedSectionId, onSelectSection, viewport }: BuilderLivePreviewProps) {
  const themeStyles = {
    '--primary-color': branding.primaryColor || '#d4af37',
    '--secondary-color': branding.secondaryColor || '#131313',
    '--font-header': branding.fontHeader || 'Bodoni Moda',
    '--font-body': branding.fontBody || 'Hanken Grotesk',
  } as React.CSSProperties;

  const btnStyleClass = (variant: 'primary' | 'outline') => {
    const radius = branding.buttonStyle === 'pill' ? 'rounded-full' : branding.buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-none';
    if (variant === 'primary') {
      return `px-5 py-2.5 bg-[var(--primary-color)] text-neutral-950 font-bold text-[9px] tracking-wider uppercase ${radius} hover:opacity-90 transition-all inline-block shadow-sm`;
    }
    return `px-5 py-2.5 bg-transparent text-stone-250 border border-stone-250/40 font-bold text-[9px] tracking-wider uppercase ${radius} hover:bg-white/5 hover:border-stone-200 transition-all inline-block`;
  };

  const cardStyleClass = () => {
    const radius = branding.buttonStyle === 'pill' ? 'rounded-3xl' : branding.buttonStyle === 'rounded' ? 'rounded-2xl' : 'rounded-none';
    if (branding.cardStyle === 'shadow') {
      return `bg-neutral-900 border border-white/5 shadow-2xl ${radius}`;
    }
    if (branding.cardStyle === 'flat') {
      return `bg-neutral-900 border-none ${radius}`;
    }
    return `bg-white/5 border border-white/10 backdrop-blur-md ${radius}`; // glass
  };

  const renderPreviewSection = (sec: Section) => {
    const config = sec.configJson || {};
    const isSelected = selectedSectionId === sec.id;
    
    const sectionWrapper = (content: React.ReactNode) => (
      <div
        key={sec.id}
        onClick={() => onSelectSection(sec)}
        className={`relative group cursor-pointer transition-all duration-350 select-none ${
          isSelected ? 'ring-4 ring-amber-500 z-20' : 'hover:ring-2 hover:ring-amber-500/50'
        }`}
      >
        <div className="absolute top-2 left-2 bg-amber-500 text-stone-950 font-bold text-[8px] tracking-widest uppercase px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-30">
          Edit Layout: {sec.type}
        </div>
        {content}
      </div>
    );

    switch (sec.type) {
      case 'hero':
        return sectionWrapper(
          <div className="relative h-[320px] w-full flex items-center justify-center overflow-hidden bg-neutral-950 text-stone-100">
            <div className="absolute inset-0">
              <img
                className="w-full h-full object-cover grayscale-[15%] brightness-[35%]"
                alt="Hero View"
                src={config.backgroundImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800'}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/20 to-neutral-950"></div>
            </div>
            <div className="relative z-10 text-center px-4 max-w-lg">
              <p className="font-semibold text-[8px] text-[var(--primary-color)] mb-2 tracking-[0.2em] uppercase">
                {branding.logo || 'EXCLUSIVE RESIDENCES'}
              </p>
              <h1 className="text-xl md:text-2xl leading-tight mb-3 text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.title || 'Architectural Landmark'}<br />
                <span className="italic font-normal text-[var(--primary-color)]">{config.subtitle || 'Signature Quality'}</span>
              </h1>
              {config.buttonText && (
                <div className="flex gap-2 justify-center">
                  <span className={btnStyleClass('primary')}>
                    {config.buttonText}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case 'features':
        return sectionWrapper(
          <div className="bg-neutral-900 py-8 px-4 border-t border-white/5 text-stone-250">
            <div className="space-y-3 mb-6">
              <span className="text-[8px] font-bold text-[var(--primary-color)] tracking-widest uppercase block">
                {config.title || 'THE CONCEPT'}
              </span>
              <h2 className="text-lg text-stone-100 font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.subtitle || 'A Paradigm of Artistry'}
              </h2>
              <p className="text-stone-400 text-[10px] leading-relaxed">
                {config.description || 'Crafted with passion, designed to bridge structure with environmental design.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(config.features || []).map((feat: any, idx: number) => (
                <div key={idx} className={`overflow-hidden relative aspect-[4/5] ${cardStyleClass()}`}>
                  <img
                    className="w-full h-full object-cover"
                    alt={feat.title}
                    src={feat.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=300'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-75"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-stone-100 text-[10px] font-light">{feat.title}</h3>
                    <p className="text-[var(--primary-color)] uppercase tracking-widest text-[6px] font-bold mt-0.5">
                      {feat.subtitle}
                    </p>
                  </div>
                </div>
              ))}
              {(!config.features || config.features.length === 0) && (
                <div className="col-span-2 p-4 border border-dashed border-white/10 rounded-xl text-center text-[9px] text-stone-500 italic">
                  No features config.
                </div>
              )}
            </div>
          </div>
        );

      case 'gallery':
        const galleryImages = config.images || [];
        return sectionWrapper(
          <div className="bg-neutral-950 py-8 px-4 border-t border-white/5">
            <div className="text-center mb-6">
              <span className="text-[8px] font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-1">
                {config.title || 'PORTFOLIO'}
              </span>
              <h2 className="text-lg font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.subtitle || 'Cinematic Photo Gallery'}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {galleryImages.map((imgUrl: string, idx: number) => (
                <div key={idx} className={`overflow-hidden aspect-video ${cardStyleClass()}`}>
                  <img className="w-full h-full object-cover" src={imgUrl} alt={`Gallery ${idx + 1}`} />
                </div>
              ))}
              {galleryImages.length === 0 && (
                <div className="col-span-2 p-4 border border-dashed border-white/10 rounded-xl text-center text-[9px] text-stone-500 italic">
                  No photos added to gallery.
                </div>
              )}
            </div>
          </div>
        );

      case 'amenities':
        const ams = config.amenities || [];
        return sectionWrapper(
          <div className="bg-neutral-900 py-8 px-4 border-t border-white/5">
            <div className="text-center mb-6">
              <span className="text-[8px] font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-1">
                {config.title || 'AMENITIES'}
              </span>
              <h2 className="text-lg font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.subtitle || 'Designed for Comfort'}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ams.map((amenity: string, idx: number) => (
                <div key={idx} className={`p-3.5 flex flex-col justify-between h-16 ${cardStyleClass()}`}>
                  <span className="text-xs text-[var(--primary-color)]">✓</span>
                  <span className="font-bold text-stone-100 tracking-wide text-[9px]">{amenity}</span>
                </div>
              ))}
              {ams.length === 0 && (
                <div className="col-span-2 p-4 border border-dashed border-white/10 rounded-xl text-center text-[9px] text-stone-500 italic">
                  No amenities configured.
                </div>
              )}
            </div>
          </div>
        );

      case 'cta':
        return sectionWrapper(
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 py-8 px-4 border-t border-white/5 text-center space-y-3">
            <h2 className="text-md text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
              {config.title || 'Ready to Experience luxury?'}
            </h2>
            <p className="text-stone-400 text-[9px] leading-relaxed">
              {config.subtitle || 'Book a private tour with our relationship manager.'}
            </p>
            {config.buttonText && (
              <div className="pt-1">
                <span className={btnStyleClass('primary')}>
                  {config.buttonText}
                </span>
              </div>
            )}
          </div>
        );

      case 'contact':
        return sectionWrapper(
          <div className="py-8 px-4 bg-neutral-900 border-t border-white/5">
            <div className="bg-neutral-950 border border-white/5 rounded-2xl p-4 shadow-xl space-y-3 max-w-xs mx-auto">
              <div className="text-center">
                <span className="text-[8px] font-bold text-[var(--primary-color)] tracking-widest uppercase">
                  INQUIRE DETAILS
                </span>
                <h3 className="text-md text-stone-100 font-light mt-0.5" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Schedule Private Tour'}
                </h3>
              </div>
              <div className="space-y-1.5 text-[9px]">
                <div className="h-7 rounded bg-neutral-900 border border-white/10 px-2.5 flex items-center text-stone-500">Full Name</div>
                <div className="h-7 rounded bg-neutral-900 border border-white/10 px-2.5 flex items-center text-stone-500">Email Address</div>
                <div className="h-7 rounded bg-neutral-900 border border-white/10 px-2.5 flex items-center text-stone-500">Phone Number</div>
                <div className="h-7 rounded bg-[var(--primary-color)] text-neutral-950 font-bold flex items-center justify-center uppercase tracking-wider text-[8px]">
                  {config.buttonText || 'Submit Inquiry'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'video':
        return sectionWrapper(
          <div className="bg-neutral-950 py-8 px-4 border-t border-white/5 text-center space-y-2">
            <h3 className="text-sm text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
              {config.title || 'Walkthrough Tour'}
            </h3>
            <p className="text-stone-400 text-[8px]">{config.subtitle}</p>
            <div className="aspect-video max-w-xs mx-auto border border-white/15 rounded-xl bg-neutral-900 flex items-center justify-center text-[9px] text-stone-500">
              ▶ Video Player Frame
            </div>
          </div>
        );

      case 'virtual-tour':
        return sectionWrapper(
          <div className="bg-neutral-900 py-8 px-4 border-t border-white/5 text-center space-y-2">
            <h3 className="text-sm text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
              {config.title || 'Virtual 3D Walkthrough'}
            </h3>
            <div className="aspect-video h-[120px] max-w-sm mx-auto border border-dashed border-white/10 rounded-xl bg-neutral-950 flex flex-col items-center justify-center text-[9px] text-stone-500 gap-1">
              <span>🌐 Web3D Virtual Tour Embed View</span>
            </div>
          </div>
        );

      case 'inventory':
        return sectionWrapper(
          <div className="bg-neutral-950 py-8 px-4 border-t border-white/5 text-stone-200">
            <div className="text-center mb-4">
              <span className="text-[8px] font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-0.5">
                LIVE AVAILABILITY
              </span>
              <h2 className="text-sm font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                Interactive Unit Inventory
              </h2>
            </div>
            <div className="border border-white/10 bg-neutral-900/50 p-3 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                <div className="p-1 border border-[var(--primary-color)] bg-neutral-900 rounded text-[var(--primary-color)] font-bold text-center">Tower Aurelia</div>
                <div className="p-1 border border-white/5 bg-neutral-900/40 rounded text-stone-400 text-center">Tower Solis</div>
              </div>
              <div className="pt-2 border-t border-white/5 grid grid-cols-4 gap-1 text-[7px] font-mono">
                <div className="p-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-center">A-101</div>
                <div className="p-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-center">A-102</div>
                <div className="p-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-center">A-103</div>
                <div className="p-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-center">A-104</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={themeStyles} className="w-full bg-neutral-950 text-stone-100 font-sans border border-neutral-800 rounded-b-2xl overflow-y-auto max-h-[500px]">
      {branding.fontHeader && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${branding.fontHeader.replace(/\s+/g, '+')}&family=${(branding.fontBody || 'Inter').replace(/\s+/g, '+')}&display=swap`}
          rel="stylesheet"
        />
      )}
      <div className="flex flex-col w-full">
        {sections.map((sec) => renderPreviewSection(sec))}
        {sections.length === 0 && (
          <div className="py-20 text-center text-xs text-stone-500 italic">
            Add layout sections to see live rendering.
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent: Section Configuration Form Helper
interface SectionConfigFormProps {
  section: Section;
  presets: AnimationPreset[];
  isReadOnly: boolean;
  onSave: (config: any) => void;
}

function SectionConfigForm({ section, presets, isReadOnly, onSave }: SectionConfigFormProps) {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    setConfig(section.configJson || {});
  }, [section]);

  const handleFieldChange = (key: string, value: any) => {
    setConfig({
      ...config,
      [key]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 1. Animation presets settings (Standard on all sections) */}
      <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-3">
        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block">GSAP Scroll Animations</span>
        
        <div>
          <label className="text-[9px] font-bold text-gray-400 block mb-1">Preset Animation Preset</label>
          <select
            disabled={isReadOnly}
            value={config.animation || 'fade-up'}
            onChange={(e) => handleFieldChange('animation', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.type}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold text-gray-400 block mb-1">Duration (Seconds)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              readOnly={isReadOnly}
              value={config.duration !== undefined ? config.duration : 1.2}
              onChange={(e) => handleFieldChange('duration', parseFloat(e.target.value) || 1.2)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 block mb-1">Delay (Seconds)</label>
            <input
              type="number"
              step="0.1"
              min="0.0"
              readOnly={isReadOnly}
              value={config.delay !== undefined ? config.delay : 0.3}
              onChange={(e) => handleFieldChange('delay', parseFloat(e.target.value) || 0.0)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Custom fields based on type */}
      <div className="space-y-4">
        {(section.type === 'hero' || section.type === 'cta') && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Header Title Text</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle Text</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Button Text</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={config.buttonText || ''}
                  onChange={(e) => handleFieldChange('buttonText', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Button URL Redirection</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={config.buttonUrl || ''}
                  onChange={(e) => handleFieldChange('buttonUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>
            {section.type === 'hero' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Background Image URL</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={config.backgroundImage || ''}
                  onChange={(e) => handleFieldChange('backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
            )}
          </>
        )}

        {section.type === 'features' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Section Header Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Description Paragraph</label>
              <textarea
                readOnly={isReadOnly}
                rows={3}
                value={config.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {section.type === 'gallery' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Gallery Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Image URLs (comma separated)</label>
              <textarea
                readOnly={isReadOnly}
                rows={3}
                value={Array.isArray(config.images) ? config.images.join(', ') : ''}
                onChange={(e) =>
                  handleFieldChange(
                    'images',
                    e.target.value.split(',').map((u) => u.trim()).filter((u) => u !== '')
                  )
                }
                placeholder="https://image1.jpg, https://image2.jpg"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-mono focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {section.type === 'amenities' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Amenities Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Amenities List (comma separated)</label>
              <textarea
                readOnly={isReadOnly}
                rows={3}
                value={Array.isArray(config.amenities) ? config.amenities.join(', ') : ''}
                onChange={(e) =>
                  handleFieldChange(
                    'amenities',
                    e.target.value.split(',').map((u) => u.trim()).filter((u) => u !== '')
                  )
                }
                placeholder="Rooftop Infinity Pool, Bespoke Gym, 24/7 Concierge"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {section.type === 'contact' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Form Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle Details</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Submit Button Label</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.buttonText || ''}
                onChange={(e) => handleFieldChange('buttonText', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </>
        )}

        {section.type === 'video' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Video Section Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle Details</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Direct Video URL (.mp4 / stream)</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.videoUrl || ''}
                onChange={(e) => handleFieldChange('videoUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </>
        )}

        {section.type === 'virtual-tour' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Virtual Tour Title</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subtitle Details</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.subtitle || ''}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Tour Embed Frame Link (WebGL / Matterport / GLB)</label>
              <input
                type="text"
                readOnly={isReadOnly}
                value={config.tourUrl || ''}
                onChange={(e) => handleFieldChange('tourUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <PremiumButton
          variant="primary"
          type="submit"
          disabled={isReadOnly}
        >
          Save Configuration
        </PremiumButton>
      </div>
    </form>
  );
}
