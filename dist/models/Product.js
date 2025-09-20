"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CATEGORIES = void 0;
exports.DEFAULT_CATEGORIES = [
    {
        id: 'google_email',
        name: '谷歌邮箱',
        slug: 'google-email',
        sort_order: 1,
        subcategories: [
            { id: 'google_old', name: '老号', slug: 'google-old', parent_id: 'google_email', sort_order: 1 },
            { id: 'google_new', name: '新号', slug: 'google-new', parent_id: 'google_email', sort_order: 2 },
            { id: 'google_2fa', name: '2FA号', slug: 'google-2fa', parent_id: 'google_email', sort_order: 3 },
            { id: 'google_enterprise', name: '企业版', slug: 'google-enterprise', parent_id: 'google_email', sort_order: 4 }
        ]
    },
    {
        id: 'microsoft_email',
        name: '微软邮箱',
        slug: 'microsoft-email',
        sort_order: 2,
        subcategories: [
            { id: 'hotmail', name: 'Hotmail', slug: 'hotmail', parent_id: 'microsoft_email', sort_order: 1 },
            { id: 'outlook', name: 'Outlook', slug: 'outlook', parent_id: 'microsoft_email', sort_order: 2 },
            { id: 'microsoft_international', name: '各国后缀', slug: 'microsoft-international', parent_id: 'microsoft_email', sort_order: 3 }
        ]
    },
    {
        id: 'other_email',
        name: '其他邮箱',
        slug: 'other-email',
        sort_order: 3,
        subcategories: [
            { id: 'yahoo', name: '雅虎邮箱', slug: 'yahoo', parent_id: 'other_email', sort_order: 1 },
            { id: 'russia_email', name: '俄罗斯邮箱', slug: 'russia-email', parent_id: 'other_email', sort_order: 2 },
            { id: 'china_email', name: '网易/新浪邮箱', slug: 'china-email', parent_id: 'other_email', sort_order: 3 }
        ]
    }
];
