import { ContentItem, SearchResult } from '../types';

export class SearchService {
  async performSearch(query: string, items: ContentItem[]): Promise<SearchResult[]> {
    console.log('=== SEARCH START ===');
    console.log('Performing search for:', query, 'in', items.length, 'items');
    
    // Debug: Show all items being searched
    items.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.type} - "${item.title}" - Content length: ${item.content?.length || 0}`);
      if (item.content) {
        console.log(`  Content preview: "${item.content.substring(0, 100)}..."`);
      }
    });
    
    if (!query.trim()) {
      return [];
    }

    // Clean and prepare search terms - focus on meaningful words
    const searchTerms = query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length >= 2) // Require at least 2 characters to avoid noise
      .map(term => term.replace(/[^\w]/g, '')) // Remove special characters
      .filter(term => term.length >= 2); // Filter again after cleaning

    console.log('Search terms:', searchTerms);

    const results: SearchResult[] = [];

    for (const item of items) {
      console.log(`\n--- Checking item: "${item.title}" (${item.type}) ---`);
      console.log(`Content: "${item.content?.substring(0, 150)}..."`);
      
      const relevanceScore = this.calculateRelevance(searchTerms, item);
      console.log(`Relevance score: ${relevanceScore}`);
      
      if (relevanceScore > 0) {
        const matchedSegments = this.findMatchedSegments(searchTerms, item);
        const highlightedContent = this.highlightMatches(item.content, searchTerms);
        
        console.log(`✓ MATCH FOUND - Score: ${relevanceScore}, Segments: ${matchedSegments.length}`);
        
        results.push({
          item,
          relevanceScore,
          matchedSegments,
          highlightedContent
        });
      } else {
        console.log(`✗ No match`);
      }
    }

    console.log(`\n=== SEARCH COMPLETE: Found ${results.length} results ===`);
    
    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRelevance(searchTerms: string[], item: ContentItem): number {
    if (!item.content && !item.title) {
      console.log(`  No content or title for item`);
      return 0;
    }

    const titleLower = (item.title || '').toLowerCase().replace(/[^\w\s]/g, '');
    const contentLower = (item.content || '').toLowerCase().replace(/[^\w\s]/g, '');
    let score = 0;
    let hasMatch = false;

    console.log(`  Searching in title: "${titleLower}"`);
    console.log(`  Searching in content: "${contentLower.substring(0, 100)}..."`);

    for (const term of searchTerms) {
      if (!term || term.length < 2) continue; // Skip very short terms
      
      console.log(`    Checking term: "${term}"`);

      // 1. EXACT WORD MATCHES IN TITLE (Highest Priority)
      const titleWords = titleLower.split(/\s+/);
      const exactTitleMatch = titleWords.some(word => word === term);
      if (exactTitleMatch) {
        score += 100;
        hasMatch = true;
        console.log(`      ✓ Exact title word match: +100`);
      }

      // 2. EXACT WORD MATCHES IN CONTENT (High Priority)
      const contentWords = contentLower.split(/\s+/);
      const exactContentMatches = contentWords.filter(word => word === term).length;
      if (exactContentMatches > 0) {
        const points = exactContentMatches * 20;
        score += points;
        hasMatch = true;
        console.log(`      ✓ Exact content word matches (${exactContentMatches}): +${points}`);
      }

      // 3. WORD BOUNDARY MATCHES (Medium Priority)
      // Use regex with word boundaries to avoid substring matches
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      
      const titleBoundaryMatches = (titleLower.match(wordBoundaryRegex) || []).length;
      if (titleBoundaryMatches > 0) {
        const points = titleBoundaryMatches * 30;
        score += points;
        hasMatch = true;
        console.log(`      ✓ Title word boundary matches (${titleBoundaryMatches}): +${points}`);
      }

      const contentBoundaryMatches = (contentLower.match(wordBoundaryRegex) || []).length;
      if (contentBoundaryMatches > 0) {
        const points = contentBoundaryMatches * 15;
        score += points;
        hasMatch = true;
        console.log(`      ✓ Content word boundary matches (${contentBoundaryMatches}): +${points}`);
      }

      // 4. STARTS WITH MATCHES (Lower Priority) - Only for longer terms
      if (term.length >= 4) {
        const startsWithMatches = contentWords.filter(word => word.startsWith(term)).length;
        if (startsWithMatches > 0) {
          const points = startsWithMatches * 5;
          score += points;
          hasMatch = true;
          console.log(`      ✓ Starts with matches (${startsWithMatches}): +${points}`);
        }
      }
    }

    // Only return score if there's at least one match
    if (!hasMatch) {
      console.log(`    No matches found`);
      return 0;
    }

    // Small boost for newer items
    const hoursOld = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 3 - hoursOld * 0.05);
    score += recencyBoost;

    const finalScore = Math.round(score);
    console.log(`    Final score: ${finalScore}`);
    return finalScore;
  }

  // Helper method to escape special regex characters
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private findMatchedSegments(searchTerms: string[], item: ContentItem): string[] {
    const segments: string[] = [];
    const content = item.content || '';
    const segmentLength = 120;

    if (!content) return segments;

    // Find all word boundary matches first
    const matches: { term: string; index: number; length: number }[] = [];
    
    for (const term of searchTerms) {
      if (!term || term.length < 2) continue;
      
      // Use word boundaries to find only complete word matches
      const escapedTerm = this.escapeRegex(term);
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          term,
          index: match.index,
          length: match[0].length
        });
        
        // Prevent infinite loop
        if (!regex.global) break;
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // Create segments around matches
    const usedRanges: { start: number; end: number }[] = [];
    
    for (const match of matches) {
      const contextStart = Math.max(0, match.index - segmentLength / 2);
      const contextEnd = Math.min(content.length, match.index + match.length + segmentLength / 2);
      
      // Check if this range overlaps with existing segments
      const overlaps = usedRanges.some(range => 
        (contextStart >= range.start && contextStart <= range.end) ||
        (contextEnd >= range.start && contextEnd <= range.end) ||
        (contextStart <= range.start && contextEnd >= range.end)
      );
      
      if (!overlaps && segments.length < 3) {
        // Find word boundaries for cleaner segments
        let segmentStart = contextStart;
        let segmentEnd = contextEnd;
        
        // Adjust to word boundaries
        while (segmentStart > 0 && content[segmentStart] !== ' ') {
          segmentStart--;
        }
        while (segmentEnd < content.length && content[segmentEnd] !== ' ') {
          segmentEnd++;
        }
        
        let segment = content.substring(segmentStart, segmentEnd).trim();
        
        // Add ellipsis
        if (segmentStart > 0) segment = '...' + segment;
        if (segmentEnd < content.length) segment = segment + '...';
        
        segments.push(segment);
        usedRanges.push({ start: contextStart, end: contextEnd });
      }
    }

    return segments;
  }

  private highlightMatches(content: string, searchTerms: string[]): string {
    if (!content) return '';
    
    let highlightedContent = content;

    // Sort terms by length (longest first) to avoid nested highlighting issues
    const sortedTerms = [...searchTerms].sort((a, b) => b.length - a.length);

    for (const term of sortedTerms) {
      if (!term || term.length < 2) continue;
      
      // Use word boundaries to highlight only complete words
      const escapedTerm = this.escapeRegex(term);
      const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
      
      highlightedContent = highlightedContent.replace(
        regex, 
        '<mark class="search-highlight">$1</mark>'
      );
    }

    return highlightedContent;
  }

  private fuzzyMatch(term: string, text: string): boolean {
    if (!term || !text || term.length < 3) {
      return false;
    }

    const termLower = term.toLowerCase();
    const words = text.toLowerCase().split(/\s+/);
    
    // Only check for fuzzy matches in individual words, not substrings
    for (const word of words) {
      if (word.length < 3) continue;
      
      // Skip if word is too different in length
      if (Math.abs(word.length - termLower.length) > 2) continue;
      
      // Calculate edit distance (simple version)
      let matches = 0;
      const minLength = Math.min(word.length, termLower.length);
      
      for (let i = 0; i < minLength; i++) {
        if (word[i] === termLower[i]) {
          matches++;
        }
      }
      
      // If 85% of characters match in the same positions, consider it a fuzzy match
      if (matches / minLength >= 0.85) {
        return true;
      }
    }
    
    return false;
  }
}