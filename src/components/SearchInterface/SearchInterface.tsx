import React, { useState } from 'react';
import { SearchResult } from '../../types';
import { SpeechService } from '../../services/SpeechService';
import styles from './SearchInterface.module.css';

interface SearchInterfaceProps {
  onSearch: (query: string, isVoiceSearch: boolean) => void;
  results: SearchResult[];
  isLoading: boolean;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ 
  onSearch, 
  results, 
  isLoading 
}) => {
  const [query, setQuery] = useState('');
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [speechService] = useState(() => new SpeechService());

  // Debounced search as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear results if search is empty
    if (value.trim().length === 0) {
      onSearch('', false);
      return;
    }
    
    // Auto-search after user stops typing for 500ms
    if (value.trim().length > 2) {
      setTimeout(() => {
        if (query === value && value.trim()) {
          console.log('Auto-searching for:', value.trim());
          onSearch(value.trim(), false);
        }
      }, 500);
    }
  };

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchQuery = query.trim();
    console.log('Performing text search for:', searchQuery);
    if (searchQuery) {
      onSearch(searchQuery, false);
    }
  };

  const handleVoiceSearch = async () => {
    if (!speechService.isSupported()) {
      alert('Voice search is not supported in your browser');
      return;
    }

    try {
      setIsVoiceSearching(true);
      await speechService.startRecording();
      
      // Auto-stop after 5 seconds for search queries
      setTimeout(async () => {
        try {
          const result = await speechService.stopRecording();
          setQuery(result.text);
          onSearch(result.text, true);
        } catch (error) {
          console.error('Voice search failed:', error);
        } finally {
          setIsVoiceSearching(false);
        }
      }, 5000);
      
    } catch (error) {
      setIsVoiceSearching(false);
      console.error('Failed to start voice search:', error);
    }
  };

  const stopVoiceSearch = async () => {
    try {
      const result = await speechService.stopRecording();
      setQuery(result.text);
      onSearch(result.text, true);
    } catch (error) {
      console.error('Voice search failed:', error);
    } finally {
      setIsVoiceSearching(false);
    }
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <form onSubmit={handleTextSearch} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search your notes and files..."
              className={styles.searchInput}
              disabled={isVoiceSearching}
            />
            <button
              type="submit"
              className={styles.searchButton}
              disabled={isLoading || isVoiceSearching || !query.trim()}
            >
              {isLoading ? (
                <div className={styles.spinner}></div>
              ) : (
                <div className={styles.searchIcon}></div>
              )}
            </button>
            <button
              type="button"
              onClick={isVoiceSearching ? stopVoiceSearch : handleVoiceSearch}
              className={`${styles.voiceButton} ${isVoiceSearching ? styles.recording : ''}`}
              disabled={isLoading}
            >
              <div className={styles.micIcon}></div>
            </button>
          </div>
        </form>
        
        {isVoiceSearching && (
          <div className={styles.voiceIndicator}>
            <div className={styles.pulse}></div>
            <span>Listening for your search...</span>
          </div>
        )}
      </div>

      <div className={styles.results}>
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Searching...</p>
          </div>
        )}

        {!isLoading && results.length === 0 && query && (
          <div className={styles.emptyState}>
            <p>No results found for "{query}"</p>
            <p className={styles.suggestion}>Try different words</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className={styles.resultsList}>
            <p className={styles.resultsCount}>
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            
            {results.map((result) => (
              <div key={result.item.id} className={styles.resultItem}>
                <div className={styles.resultHeader}>
                  <h3 className={styles.resultTitle}>{result.item.title}</h3>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultType}>
                      {result.item.type === 'voice' ? '📝 Voice Text' : '📄 File'}
                    </span>
                    <span className={styles.resultDate}>
                      {formatTimestamp(result.item.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className={styles.resultContent}>
                  {result.matchedSegments.length > 0 ? (
                    result.matchedSegments.map((segment, index) => (
                      <p 
                        key={index} 
                        className={styles.resultSegment}
                        dangerouslySetInnerHTML={{ 
                          __html: segment.replace(
                            new RegExp(`(${query.split(' ').join('|')})`, 'gi'),
                            '<mark>$1</mark>'
                          )
                        }}
                      />
                    ))
                  ) : (
                    <p className={styles.resultSegment}>
                      {result.item.content.substring(0, 200)}
                      {result.item.content.length > 200 ? '...' : ''}
                    </p>
                  )}
                </div>
                
                <div className={styles.resultScore}>
                  Relevance: {Math.round(result.relevanceScore)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};