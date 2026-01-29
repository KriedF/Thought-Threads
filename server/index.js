const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
let db;
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'thoughts.db');

// Simple stemmer (Porter-like, simplified) - defined early for use in category setup
function stem(word) {
  word = word.toLowerCase();
  const suffixes = ['ing', 'ed', 'ly', 'er', 'est', 'ness', 'ment', 'tion', 'sion', 'ies', 's'];
  for (const suffix of suffixes) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      if (suffix === 'ies') {
        return word.slice(0, -3) + 'y';
      }
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// Job categories - maps skills to career paths
const semanticCategories = {
  // Software & Technology
  'Software Development': ['programming', 'coding', 'developer', 'software', 'engineer', 'code', 'python', 'javascript', 'java', 'csharp', 'c++', 'ruby', 'php', 'swift', 'kotlin', 'golang', 'rust', 'typescript', 'react', 'angular', 'vue', 'node', 'nodejs', 'django', 'flask', 'rails', 'spring', 'dotnet', 'frontend', 'backend', 'fullstack', 'web', 'mobile', 'app', 'application', 'api', 'rest', 'graphql', 'microservices', 'database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'git', 'github', 'gitlab', 'agile', 'scrum', 'devops', 'cicd', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud', 'linux', 'unix', 'bash', 'scripting', 'automation', 'testing', 'debugging', 'algorithms', 'oop', 'functional', 'architecture', 'scalable', 'performance', 'optimization', 'security', 'encryption', 'authentication', 'sdk', 'framework', 'library', 'npm', 'pip', 'maven', 'gradle', 'webpack', 'vite', 'compiler', 'ide', 'vscode', 'intellij', 'xcode', 'android', 'ios', 'flutter', 'reactnative', 'electron', 'saas', 'serverless', 'lambda', 'terraform', 'ansible', 'jenkins', 'jira'],

  // Data Science & Analytics
  'Data Science': ['data', 'analytics', 'analysis', 'analyst', 'statistics', 'statistical', 'machine', 'learning', 'ml', 'ai', 'artificial', 'intelligence', 'deep', 'neural', 'network', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scipy', 'sklearn', 'jupyter', 'notebook', 'visualization', 'tableau', 'powerbi', 'looker', 'dashboards', 'metrics', 'kpi', 'forecasting', 'predictive', 'modeling', 'regression', 'classification', 'clustering', 'nlp', 'computer', 'vision', 'bigdata', 'hadoop', 'spark', 'databricks', 'snowflake', 'etl', 'pipeline', 'warehouse', 'mining', 'insights', 'reporting', 'excel', 'spreadsheet', 'pivot', 'vlookup', 'quantitative', 'qualitative', 'research', 'hypothesis', 'experiment', 'ab', 'segmentation', 'cohort'],

  // Design & Creative
  'Design & Creative': ['design', 'designer', 'graphic', 'visual', 'ui', 'ux', 'user', 'experience', 'interface', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'indesign', 'xd', 'creative', 'creativity', 'art', 'artistic', 'illustration', 'branding', 'brand', 'logo', 'typography', 'layout', 'composition', 'color', 'palette', 'mockup', 'wireframe', 'prototype', 'prototyping', 'animation', 'motion', 'video', 'editing', 'premiere', 'aftereffects', 'cinema4d', 'blender', '3d', 'rendering', 'photography', 'photographer', 'lightroom', 'retouching', 'print', 'packaging', 'responsive', 'interaction', 'usability', 'accessibility', 'portfolio', 'aesthetic', 'style', 'trend', 'concept', 'storyboard', 'drawing', 'paint'],

  // Marketing & Sales
  'Marketing & Sales': ['marketing', 'marketer', 'sales', 'selling', 'salesperson', 'advertising', 'ads', 'campaign', 'digital', 'social', 'media', 'content', 'seo', 'sem', 'ppc', 'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'influencer', 'email', 'newsletter', 'hubspot', 'salesforce', 'crm', 'lead', 'leads', 'generation', 'conversion', 'funnel', 'prospect', 'prospecting', 'cold', 'calling', 'outreach', 'pitch', 'presentation', 'demo', 'negotiation', 'closing', 'quota', 'target', 'revenue', 'growth', 'acquisition', 'retention', 'loyalty', 'awareness', 'engagement', 'roi', 'budget', 'strategy', 'planning', 'market', 'competitor', 'pricing', 'promotion', 'pr', 'public', 'relations', 'communications', 'copywriting', 'copy', 'headline', 'cta', 'affiliate', 'partnership', 'b2b', 'b2c', 'ecommerce', 'retail'],

  // Healthcare & Medical
  'Healthcare': ['healthcare', 'health', 'medical', 'medicine', 'clinical', 'patient', 'care', 'nursing', 'nurse', 'rn', 'lpn', 'cna', 'doctor', 'physician', 'surgeon', 'surgery', 'diagnosis', 'treatment', 'therapy', 'therapist', 'physical', 'occupational', 'speech', 'respiratory', 'pharmacy', 'pharmacist', 'pharmaceutical', 'drug', 'medication', 'prescription', 'hospital', 'clinic', 'emergency', 'icu', 'lab', 'laboratory', 'technician', 'radiology', 'xray', 'mri', 'ultrasound', 'imaging', 'pathology', 'anatomy', 'physiology', 'cardiology', 'neurology', 'oncology', 'pediatrics', 'geriatrics', 'psychiatry', 'psychology', 'mental', 'dental', 'dentist', 'hygienist', 'orthodontist', 'optometry', 'optometrist', 'hearing', 'audiology', 'emt', 'paramedic', 'firstaid', 'cpr', 'hipaa', 'ehr', 'emr', 'epic', 'charting', 'vitals', 'insurance', 'billing', 'icd', 'cpt'],

  // Finance & Accounting
  'Finance & Accounting': ['finance', 'financial', 'accounting', 'accountant', 'cpa', 'bookkeeping', 'bookkeeper', 'audit', 'auditor', 'tax', 'taxes', 'taxation', 'budget', 'budgeting', 'forecast', 'investment', 'investing', 'investor', 'banking', 'bank', 'loan', 'credit', 'debt', 'equity', 'stock', 'stocks', 'bond', 'bonds', 'portfolio', 'asset', 'liability', 'balance', 'sheet', 'income', 'statement', 'cashflow', 'expense', 'profit', 'loss', 'margin', 'gaap', 'ifrs', 'quickbooks', 'sage', 'sap', 'oracle', 'erp', 'payroll', 'ap', 'ar', 'receivable', 'payable', 'reconciliation', 'journal', 'ledger', 'entries', 'depreciation', 'amortization', 'accrual', 'compliance', 'regulatory', 'sec', 'sox', 'risk', 'underwriting', 'actuary', 'wealth', 'management', 'advisory', 'cfp', 'cfa', 'series', 'trading', 'trader', 'fintech', 'blockchain', 'crypto'],

  // Education & Training
  'Education & Training': ['education', 'teaching', 'teacher', 'instructor', 'professor', 'tutor', 'tutoring', 'curriculum', 'lesson', 'plan', 'classroom', 'student', 'students', 'learning', 'training', 'trainer', 'development', 'instructional', 'elearning', 'online', 'course', 'courses', 'workshop', 'seminar', 'lecture', 'assessment', 'grading', 'evaluation', 'feedback', 'coaching', 'coach', 'mentoring', 'mentor', 'counseling', 'counselor', 'guidance', 'academic', 'school', 'college', 'university', 'k12', 'elementary', 'middle', 'high', 'preschool', 'early', 'childhood', 'special', 'needs', 'esl', 'english', 'language', 'math', 'science', 'history', 'reading', 'writing', 'literacy', 'stem', 'steam', 'certification', 'credential', 'degree', 'masters', 'phd', 'scholarship', 'grant', 'lms', 'canvas', 'blackboard', 'moodle', 'zoom', 'virtual', 'hybrid', 'remote'],

  // Construction & Trades
  'Construction & Trades': ['construction', 'building', 'builder', 'contractor', 'subcontractor', 'carpenter', 'carpentry', 'electrician', 'electrical', 'plumber', 'plumbing', 'hvac', 'heating', 'cooling', 'ventilation', 'welding', 'welder', 'masonry', 'mason', 'concrete', 'roofing', 'roofer', 'framing', 'drywall', 'painting', 'painter', 'flooring', 'tile', 'cabinet', 'millwork', 'renovation', 'remodel', 'remodeling', 'repair', 'maintenance', 'handyman', 'inspector', 'inspection', 'blueprint', 'plans', 'permits', 'code', 'safety', 'osha', 'tools', 'power', 'hand', 'equipment', 'heavy', 'machinery', 'crane', 'forklift', 'excavator', 'bulldozer', 'commercial', 'residential', 'industrial', 'infrastructure', 'civil', 'structural', 'mechanical', 'project', 'estimating', 'estimator', 'bidding', 'scheduling', 'site', 'supervisor', 'foreman', 'apprentice', 'journeyman', 'master', 'licensed', 'bonded', 'insured', 'union', 'trade', 'skilled', 'labor'],

  // Customer Service & Support
  'Customer Service': ['customer', 'service', 'support', 'representative', 'rep', 'agent', 'specialist', 'associate', 'help', 'desk', 'helpdesk', 'call', 'center', 'phone', 'chat', 'ticket', 'tickets', 'ticketing', 'zendesk', 'freshdesk', 'intercom', 'communication', 'communicating', 'listening', 'empathy', 'patience', 'problem', 'solving', 'resolution', 'escalation', 'complaint', 'complaints', 'satisfaction', 'nps', 'csat', 'relationship', 'client', 'clients', 'account', 'onboarding', 'documentation', 'knowledge', 'base', 'faq', 'troubleshooting', 'technical', 'returns', 'refunds', 'shipping', 'order', 'orders', 'inquiry', 'inquiries', 'followup', 'response', 'time', 'quality', 'assurance', 'qa', 'monitoring', 'performance'],

  // Human Resources
  'Human Resources': ['hr', 'human', 'resources', 'recruiting', 'recruiter', 'recruitment', 'talent', 'hiring', 'interview', 'interviewing', 'screening', 'sourcing', 'candidate', 'candidates', 'applicant', 'ats', 'workday', 'greenhouse', 'lever', 'job', 'posting', 'description', 'offer', 'orientation', 'performance', 'review', 'compensation', 'benefits', 'salary', 'bonus', 'insurance', 'retirement', '401k', 'pto', 'leave', 'policy', 'policies', 'handbook', 'labor', 'law', 'eeoc', 'ada', 'fmla', 'employee', 'engagement', 'culture', 'diversity', 'inclusion', 'dei', 'wellness', 'workers', 'comp', 'termination', 'offboarding', 'exit', 'hris', 'organizational', 'change'],

  // Operations & Logistics
  'Operations & Logistics': ['operations', 'logistics', 'supply', 'chain', 'procurement', 'purchasing', 'vendor', 'supplier', 'inventory', 'warehouse', 'warehousing', 'distribution', 'fulfillment', 'shipping', 'receiving', 'freight', 'transportation', 'trucking', 'driver', 'cdl', 'delivery', 'routing', 'tracking', 'customs', 'import', 'export', 'international', 'global', 'manufacturing', 'production', 'assembly', 'quality', 'control', 'qc', 'lean', 'six', 'sigma', 'kaizen', 'continuous', 'improvement', 'efficiency', 'optimization', 'capacity', 'demand', 'scheduling', 'coordination', 'wms', 'tms', 'rfid', 'barcode', 'scanning', 'picking', 'packing', 'loading', 'unloading', 'pallet', 'dock', 'fleet', 'cost', 'reduction'],

  // Legal & Compliance
  'Legal': ['legal', 'law', 'lawyer', 'attorney', 'paralegal', 'litigation', 'litigator', 'corporate', 'contract', 'contracts', 'agreement', 'negotiation', 'drafting', 'regulatory', 'regulation', 'governance', 'audit', 'investigation', 'discovery', 'brief', 'filing', 'court', 'trial', 'deposition', 'settlement', 'mediation', 'arbitration', 'intellectual', 'property', 'ip', 'patent', 'trademark', 'copyright', 'employment', 'immigration', 'bankruptcy', 'criminal', 'family', 'environmental', 'privacy', 'gdpr', 'ccpa', 'aml', 'kyc', 'ethics', 'responsibility', 'bar', 'jd', 'llm', 'westlaw', 'lexisnexis', 'clio', 'document', 'timekeeping'],

  // Administrative & Office
  'Administrative': ['administrative', 'admin', 'assistant', 'secretary', 'receptionist', 'office', 'manager', 'coordinator', 'executive', 'ea', 'calendar', 'meeting', 'meetings', 'travel', 'arrangements', 'booking', 'reports', 'invoicing', 'organization', 'organizing', 'correspondence', 'phone', 'calls', 'greeting', 'visitors', 'supplies', 'ordering', 'facilities', 'data', 'entry', 'typing', 'word', 'processing', 'microsoft', 'excel', 'powerpoint', 'outlook', 'docs', 'sheets', 'slides', 'teams', 'slack', 'multitasking', 'prioritization', 'time', 'detail', 'oriented', 'professional', 'confidential', 'discretion', 'clerical', 'records'],

  // Project & Product Management
  'Project Management': ['project', 'manager', 'pm', 'pmp', 'kanban', 'waterfall', 'methodology', 'sprint', 'backlog', 'roadmap', 'execution', 'controlling', 'scope', 'timeline', 'schedule', 'resource', 'allocation', 'mitigation', 'stakeholder', 'status', 'milestone', 'deliverable', 'dependency', 'critical', 'path', 'gantt', 'chart', 'asana', 'trello', 'monday', 'basecamp', 'smartsheet', 'ms', 'product', 'owner', 'po', 'requirements', 'story', 'stories', 'acceptance', 'criteria', 'mvp', 'launch', 'release', 'iteration', 'retrospective', 'standup', 'daily', 'cross', 'leadership'],

  // Writing & Content
  'Writing & Content': ['writing', 'writer', 'content', 'copywriting', 'copywriter', 'editor', 'proofreading', 'proofreader', 'author', 'journalist', 'journalism', 'reporter', 'blog', 'blogger', 'blogging', 'article', 'articles', 'post', 'posts', 'caption', 'script', 'scriptwriting', 'screenplay', 'documentation', 'manual', 'instructions', 'proposal', 'academic', 'essay', 'paper', 'thesis', 'dissertation', 'fiction', 'nonfiction', 'storytelling', 'narrative', 'ghostwriting', 'ghostwriter', 'keywords', 'cms', 'wordpress', 'drupal', 'medium', 'substack', 'grammar', 'ap', 'chicago', 'mla', 'apa', 'tone', 'voice', 'audience', 'publishing', 'publication', 'magazine', 'newspaper', 'book', 'ebook', 'press'],

  // Engineering (Non-Software)
  'Engineering': ['mechanical', 'civil', 'structural', 'chemical', 'aerospace', 'automotive', 'biomedical', 'petroleum', 'nuclear', 'materials', 'cad', 'autocad', 'solidworks', 'catia', 'inventor', 'revit', 'bim', 'simulation', 'fea', 'cfd', 'matlab', 'ansys', 'prototype', 'process', 'standards', 'specifications', 'regulations', 'codes', 'technical', 'drawing', 'schematic', 'circuit', 'pcb', 'plc', 'robotics', 'controls', 'instrumentation', 'reliability', 'pe', 'eit', 'fe', 'physics', 'calculus', 'thermodynamics', 'mechanics', 'dynamics', 'statics', 'fluids'],

  // Hospitality & Food Service
  'Hospitality': ['hospitality', 'hotel', 'resort', 'lodging', 'front', 'concierge', 'guest', 'services', 'housekeeping', 'housekeeper', 'bellhop', 'valet', 'restaurant', 'food', 'server', 'waiter', 'waitress', 'bartender', 'barista', 'host', 'hostess', 'busser', 'dishwasher', 'cook', 'chef', 'sous', 'line', 'prep', 'kitchen', 'culinary', 'catering', 'caterer', 'banquet', 'event', 'events', 'planner', 'venue', 'wedding', 'conference', 'casino', 'gaming', 'cruise', 'airline', 'flight', 'attendant', 'tourism', 'tour', 'reservation', 'menu', 'wine', 'sommelier', 'mixology', 'cocktail', 'servsafe', 'sanitation', 'pos', 'toast', 'opentable', 'tips', 'gratuity'],

  // Security & Law Enforcement
  'Security': ['security', 'guard', 'officer', 'patrol', 'surveillance', 'cctv', 'camera', 'alarm', 'access', 'badge', 'checkpoint', 'investigator', 'detective', 'forensic', 'evidence', 'incident', 'emergency', 'crisis', 'protection', 'loss', 'prevention', 'lp', 'assessment', 'threat', 'vulnerability', 'cybersecurity', 'cyber', 'infosec', 'firewall', 'penetration', 'soc', 'siem', 'police', 'sheriff', 'deputy', 'corrections', 'correctional', 'probation', 'parole', 'federal', 'fbi', 'dea', 'atf', 'tsa', 'border', 'military', 'veteran', 'armed', 'unarmed', 'cpl', 'first', 'aid'],

  // Transportation & Driving
  'Transportation': ['transportation', 'transport', 'truck', 'trucker', 'courier', 'dispatch', 'dispatcher', 'route', 'navigation', 'gps', 'vehicle', 'dot', 'fmcsa', 'hours', 'hos', 'eld', 'logbook', 'hazmat', 'tanker', 'flatbed', 'reefer', 'ltl', 'ftl', 'jack', 'bus', 'transit', 'passenger', 'uber', 'lyft', 'rideshare', 'taxi', 'limousine', 'chauffeur', 'pilot', 'aviation', 'captain', 'copilot', 'ground', 'crew', 'mechanic', 'railroad', 'train', 'conductor', 'maritime', 'ship', 'deckhand', 'regulations', 'endorsement', 'clean', 'record', 'background'],

  // Real Estate & Property
  'Real Estate': ['real', 'realtor', 'broker', 'brokerage', 'property', 'properties', 'residential', 'commercial', 'land', 'buying', 'listing', 'mls', 'showing', 'open', 'house', 'escrow', 'title', 'deed', 'mortgage', 'financing', 'preapproval', 'appraisal', 'appraiser', 'home', 'condo', 'townhouse', 'apartment', 'rental', 'lease', 'leasing', 'tenant', 'landlord', 'flip', 'flipping', 'cap', 'rate', 'cash', 'flow', 'appreciation', 'cma', 'zoning', 'staging', 'networking', 'referral', 'commission', 'continuing'],

  // Science & Research
  'Science & Research': ['scientist', 'researcher', 'experiment', 'experimental', 'theory', 'collection', 'methodology', 'protocol', 'procedure', 'observation', 'measurement', 'instrument', 'sample', 'specimen', 'culture', 'cell', 'molecular', 'biology', 'biologist', 'chemistry', 'chemist', 'physicist', 'biochemistry', 'microbiology', 'genetics', 'genomics', 'biotechnology', 'clinical', 'fda', 'gmp', 'glp', 'journal', 'peer', 'funding', 'nih', 'nsf', 'postdoc', 'computational', 'environmental', 'ecology', 'conservation', 'marine', 'geology', 'astronomy', 'space', 'nanotechnology'],

  // General Skills
  'General Skills': ['verbal', 'interpersonal', 'teamwork', 'collaboration', 'collaborative', 'leader', 'leading', 'supervising', 'delegation', 'motivating', 'thinking', 'strategic', 'adaptability', 'flexibility', 'resilience', 'stress', 'attention', 'accuracy', 'precision', 'initiative', 'proactive', 'self', 'starter', 'motivated', 'independent', 'autonomous', 'reliable', 'dependable', 'punctual', 'professionalism', 'ethical', 'integrity', 'honest', 'trustworthy', 'discrete', 'innovative', 'resourceful', 'bilingual', 'multilingual', 'spanish', 'french', 'chinese', 'mandarin', 'german', 'japanese', 'korean', 'arabic', 'portuguese', 'russian', 'hindi']
};

// Build reverse lookup: word -> category
const wordToCategory = {};
Object.entries(semanticCategories).forEach(([category, words]) => {
  words.forEach(word => {
    wordToCategory[word] = category;
    wordToCategory[stem(word)] = category;
  });
});

// Get semantic category for a word
function getSemanticCategory(word) {
  const lower = word.toLowerCase();
  return wordToCategory[lower] || wordToCategory[stem(lower)] || null;
}

// Stop words to filter out
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'any', 'also', 'over', 'out', 'up', 'down', 'off', 'if', 'my',
  'your', 'our', 'their', 'its', 'as', 'get', 'make', 'like', 'think',
  'know', 'want', 'need', 'use', 'try', 'come', 'go', 'see', 'look', 'way',
  'im', "i'm", "don't", "dont", "can't", "cant", "won't", "wont", "it's",
  'really', 'maybe', 'something', 'things', 'thing', 'much', 'many', 'well'
]);

// Extract keywords from text
function extractKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));

  // Get unique keywords using stems
  const stemmedMap = new Map();
  words.forEach(word => {
    const stemmed = stem(word);
    if (!stemmedMap.has(stemmed)) {
      stemmedMap.set(stemmed, word);
    }
  });

  return Array.from(stemmedMap.values()).slice(0, 10);
}

// Calculate similarity between two thoughts based on keywords and semantic categories
function calculateSimilarity(keywords1, keywords2) {
  if (!keywords1.length || !keywords2.length) return 0;

  const set1 = new Set(keywords1.map(k => stem(k)));
  const set2 = new Set(keywords2.map(k => stem(k)));

  // Direct keyword match
  let intersection = 0;
  set1.forEach(k => {
    if (set2.has(k)) intersection++;
  });

  // Also check if keywords share semantic categories
  const categories1 = new Set(keywords1.map(k => getSemanticCategory(k)).filter(Boolean));
  const categories2 = new Set(keywords2.map(k => getSemanticCategory(k)).filter(Boolean));

  let categoryOverlap = 0;
  categories1.forEach(c => {
    if (categories2.has(c)) categoryOverlap++;
  });

  // Combine direct matches with category matches
  const directScore = set1.size + set2.size > 0 ? intersection / (set1.size + set2.size - intersection) : 0;
  const categoryScore = categories1.size + categories2.size > 0 ? categoryOverlap / Math.max(categories1.size, categories2.size) : 0;

  // Weight: 60% direct match, 40% category match
  return directScore * 0.6 + categoryScore * 0.4;
}

// Determine cluster based on keywords and semantic categories
function determineCluster(keywords, existingThoughts, content) {
  // First, check if any keyword belongs to a semantic category
  const categoryScores = {};

  // Check keywords against semantic categories
  keywords.forEach(keyword => {
    const category = getSemanticCategory(keyword);
    if (category) {
      categoryScores[category] = (categoryScores[category] || 0) + 2; // Strong weight for direct match
    }
  });

  // Also check the full content for category words
  const contentWords = content.toLowerCase().split(/\s+/);
  contentWords.forEach(word => {
    const category = getSemanticCategory(word);
    if (category) {
      categoryScores[category] = (categoryScores[category] || 0) + 1;
    }
  });

  // If we found semantic categories, use the best one
  const bestCategory = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])[0];

  if (bestCategory) {
    return bestCategory[0];
  }

  // Fall back to checking similarity with existing thoughts
  const clusterScores = {};

  existingThoughts.forEach(thought => {
    if (!thought.keywords) return;
    const thoughtKeywords = JSON.parse(thought.keywords);
    const similarity = calculateSimilarity(keywords, thoughtKeywords);

    if (similarity > 0.1 && thought.cluster) {
      clusterScores[thought.cluster] = (clusterScores[thought.cluster] || 0) + similarity;
    }
  });

  // If similar to existing clusters, join the best one
  const bestCluster = Object.entries(clusterScores)
    .sort((a, b) => b[1] - a[1])[0];

  if (bestCluster && bestCluster[1] > 0.1) {
    return bestCluster[0];
  }

  // Default to 'ideas' for uncategorized thoughts
  return 'ideas';
}

// Save database to file
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  try {
    // Try to load existing database
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (error) {
    console.log('Creating new database');
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      keywords TEXT,
      cluster TEXT,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      strength REAL DEFAULT 0.5,
      UNIQUE(source_id, target_id)
    )
  `);

  saveDatabase();
}

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Helper function to run queries
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
}

function dbGet(sql, params = []) {
  const results = dbAll(sql, params);
  return results[0] || null;
}

// API Routes

// Get all thoughts
app.get('/api/thoughts', (req, res) => {
  try {
    const thoughts = dbAll('SELECT * FROM thoughts ORDER BY created_at DESC');
    const connections = dbAll('SELECT * FROM connections');

    res.json({
      thoughts: thoughts.map(t => ({
        ...t,
        keywords: t.keywords ? JSON.parse(t.keywords) : []
      })),
      connections
    });
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    res.status(500).json({ error: 'Failed to fetch thoughts' });
  }
});

// Add a new thought
app.post('/api/thoughts', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Extract keywords
    const keywords = extractKeywords(content);

    // Get existing thoughts for clustering
    const existingThoughts = dbAll('SELECT * FROM thoughts');

    // Determine cluster
    const cluster = determineCluster(keywords, existingThoughts, content);

    // Insert the thought
    const result = dbRun(
      'INSERT INTO thoughts (content, keywords, cluster) VALUES (?, ?, ?)',
      [content.trim(), JSON.stringify(keywords), cluster]
    );

    const newThought = dbGet('SELECT * FROM thoughts WHERE id = ?', [result.lastInsertRowid]);

    // Create connections to similar thoughts
    const newConnections = [];
    existingThoughts.forEach(thought => {
      if (!thought.keywords) return;
      const thoughtKeywords = JSON.parse(thought.keywords);
      const similarity = calculateSimilarity(keywords, thoughtKeywords);

      if (similarity > 0.15) {
        try {
          dbRun(
            'INSERT OR IGNORE INTO connections (source_id, target_id, strength) VALUES (?, ?, ?)',
            [newThought.id, thought.id, similarity]
          );
          newConnections.push({
            source_id: newThought.id,
            target_id: thought.id,
            strength: similarity
          });
        } catch (e) {}
      }
    });

    // Also connect thoughts in the same cluster with lower strength
    existingThoughts.forEach(thought => {
      if (thought.cluster === cluster && thought.id !== newThought.id) {
        const existingConnection = dbGet(
          'SELECT * FROM connections WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)',
          [newThought.id, thought.id, thought.id, newThought.id]
        );

        if (!existingConnection) {
          try {
            dbRun(
              'INSERT OR IGNORE INTO connections (source_id, target_id, strength) VALUES (?, ?, ?)',
              [newThought.id, thought.id, 0.1]
            );
            newConnections.push({
              source_id: newThought.id,
              target_id: thought.id,
              strength: 0.1
            });
          } catch (e) {}
        }
      }
    });

    saveDatabase();

    res.json({
      thought: {
        ...newThought,
        keywords: JSON.parse(newThought.keywords || '[]')
      },
      connections: newConnections
    });
  } catch (error) {
    console.error('Error adding thought:', error);
    res.status(500).json({ error: 'Failed to add thought' });
  }
});

// Delete a thought
app.delete('/api/thoughts/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Delete connections first
    dbRun('DELETE FROM connections WHERE source_id = ? OR target_id = ?', [id, id]);

    // Delete the thought
    dbRun('DELETE FROM thoughts WHERE id = ?', [id]);

    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting thought:', error);
    res.status(500).json({ error: 'Failed to delete thought' });
  }
});

// Update thought position
app.patch('/api/thoughts/:id/position', (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;

    dbRun('UPDATE thoughts SET x = ?, y = ? WHERE id = ?', [x, y, id]);
    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Clear all thoughts
app.delete('/api/thoughts', (req, res) => {
  try {
    dbRun('DELETE FROM connections');
    dbRun('DELETE FROM thoughts');
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing thoughts:', error);
    res.status(500).json({ error: 'Failed to clear thoughts' });
  }
});

// Serve React app for any other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server after database is initialized
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🧠 Thought Threads server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
