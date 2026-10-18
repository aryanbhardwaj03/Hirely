import { Opportunity, OpportunitySortOption, LocationScope } from '../types/opportunity';

// Check if opportunity matches location scope
export function matchesLocationScope(opp: Opportunity, scope: LocationScope): boolean {
  if (scope === 'all') return true;

  const loc = (opp.location || '').toLowerCase();
  const city = (opp.city || '').toLowerCase();
  const country = (opp.country || '').toLowerCase();

  if (scope === 'delhi_ncr') {
    const isDelhiNCR =
      loc.includes('delhi') ||
      loc.includes('noida') ||
      loc.includes('gurugram') ||
      loc.includes('gurgaon') ||
      loc.includes('ncr') ||
      city.includes('delhi') ||
      city.includes('noida') ||
      city.includes('gurugram');

    // Also include verified India-wide remote roles
    const isIndiaRemote = opp.isRemote && (loc.includes('india') || country.includes('india') || loc.includes('global remote') || loc.includes('virtual'));
    return isDelhiNCR || isIndiaRemote;
  }

  if (scope === 'india') {
    const isIndia =
      loc.includes('india') ||
      loc.includes('delhi') ||
      loc.includes('bengaluru') ||
      loc.includes('bangalore') ||
      loc.includes('mumbai') ||
      loc.includes('noida') ||
      loc.includes('gurugram') ||
      loc.includes('pune') ||
      loc.includes('hyderabad') ||
      country.includes('india');

    const isGlobalRemote = opp.isRemote && (loc.includes('remote') || loc.includes('virtual'));
    return isIndia || isGlobalRemote;
  }

  if (scope === 'remote_worldwide') {
    return Boolean(opp.isRemote || opp.workArrangement === 'Remote' || loc.includes('remote') || loc.includes('virtual'));
  }

  return true;
}

// Compute distance ranking relative to reference location
export function getDistanceScore(opp: Opportunity, userLocation: string): number {
  const loc = (opp.location || '').toLowerCase();
  const userLoc = (userLocation || '').toLowerCase();

  // If user is in Delhi/NCR
  if (userLoc.includes('delhi') || userLoc.includes('ncr')) {
    if (loc.includes('delhi') || loc.includes('noida') || loc.includes('gurugram') || loc.includes('gurgaon')) {
      return 1; // Direct Local Delhi/NCR
    }
    if (loc.includes('india')) {
      return 2; // Regional India
    }
    if (opp.isRemote || loc.includes('remote') || loc.includes('virtual')) {
      return 3; // Global Remote
    }
    return 4; // Overseas In-Person
  }

  // Default proximity logic
  if (loc.includes(userLoc)) return 1;
  if (opp.isRemote) return 2;
  return 3;
}

// Sort opportunities according to the selected option
export function sortOpportunities(
  opportunities: Opportunity[],
  sortBy: OpportunitySortOption,
  userLocation: string = 'Delhi/NCR, India'
): Opportunity[] {
  const items = [...opportunities];

  switch (sortBy) {
    case 'newest':
      return items.sort((a, b) => {
        const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.match_score || 0) - (a.match_score || 0);
      });

    case 'highest_paying':
      return items.sort((a, b) => {
        const compA = a.compensationNumeric || 0;
        const compB = b.compensationNumeric || 0;
        if (compB !== compA) return compB - compA;
        return (b.match_score || 0) - (a.match_score || 0);
      });

    case 'nearest':
      return items.sort((a, b) => {
        const distA = getDistanceScore(a, userLocation);
        const distB = getDistanceScore(b, userLocation);
        if (distA !== distB) return distA - distB;
        return (b.match_score || 0) - (a.match_score || 0);
      });

    case 'best_match':
      return items.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    case 'deadline_soonest':
      return items.sort((a, b) => {
        const daysA = a.daysLeft !== null && a.daysLeft !== undefined ? a.daysLeft : 999;
        const daysB = b.daysLeft !== null && b.daysLeft !== undefined ? b.daysLeft : 999;
        if (daysA !== daysB) return daysA - daysB;
        return (b.match_score || 0) - (a.match_score || 0);
      });

    default:
      return items;
  }
}

// Filter out illegitimate sources (e.g. reddit, discord, youtube links masquerading as job posts)
export function isTrustworthySource(url: string, source: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const lowerSource = source.toLowerCase();

  const forbiddenDomains = [
    'reddit.com',
    'discord.gg',
    'discord.com',
    'youtube.com',
    'youtu.be',
    'tiktok.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
  ];

  for (const domain of forbiddenDomains) {
    if (lowerUrl.includes(domain) || lowerSource.includes(domain)) {
      return false;
    }
  }

  return true;
}
