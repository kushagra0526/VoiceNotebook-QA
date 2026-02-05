// Performance Optimization Service - Handles pagination, caching, and performance monitoring

import { DatabaseService } from './DatabaseService';
import { AnalyticsStorageService } from './AnalyticsStorageService';
import { ContentItem, SearchResult } from '../types';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'timestamp' | 'title' | 'type';
  sortOrder?: 'asc' | 'desc';
  filterBy?: {
    type?: 'voice' | 'file';
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
    limit: number;
  };
}

export interface PerformanceMetrics {
  loadTime: number;
  searchTime: number;
  renderTime: number;
  memoryUsage: number;
  itemsLoaded: number;
  cacheHitRate: number;
}

export class PerformanceOptimizationService {
  private databaseService: DatabaseService;
  private analyticsStorage: AnalyticsStorageService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    searchTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    itemsLoaded: 0,
    cacheHitRate: 0
  };

  constructor(databaseService: DatabaseService, analyticsStorage: AnalyticsStorageService) {
    this.databaseService = databaseService;
    this.analyticsStorage = analyticsStorage;
    this.startPerformanceMonitoring();
  }

  // Paginated content loading
  async loadItemsPaginated(options: PaginationOptions): Promise<PaginatedResult<ContentItem>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('items', options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.updateMetrics({ cacheHitRate: this.performanceMetrics.cacheHitRate + 1 });
      return cached;
    }

    try {
      // Get all items (we'll optimize this with actual DB pagination later)
      const allItems = await this.databaseService.getAllItems();
      
      // Apply filters
      let filteredItems = allItems;
      if (options.filterBy) {
        filteredItems = this.applyFilters(allItems, options.filterBy);
      }

      // Apply sorting
      filteredItems = this.applySorting(filteredItems, options.sortBy, options.sortOrder);

      // Calculate pagination
      const totalItems = filteredItems.length;
      const totalPages = Math.ceil(totalItems / options.limit);
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const items = filteredItems.slice(startIndex, endIndex);

      const result: PaginatedResult<ContentItem> = {
        items,
        pagination: {
          currentPage: options.page,
          totalPages,
          totalItems,
          hasNext: options.page < totalPages,
          hasPrevious: options.page > 1,
          limit: options.limit
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      // Update performance metrics
      const loadTime = performance.now() - startTime;
      this.updateMetrics({
        loadTime,
        itemsLoaded: items.length
      });

      return result;
    } catch (error) {
      console.error('Failed to load paginated items:', error);
      throw error;
    }
  }

  // Optimized search with pagination
  async searchWithPagination(
    query: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<ContentItem>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('search', { query, ...options });
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.updateMetrics({ cacheHitRate: this.performanceMetrics.cacheHitRate + 1 });
      return cached;
    }

    try {
      // Perform search
      const searchResults = await this.databaseService.searchContent(query);
      
      // Apply additional filters if specified
      let filteredResults = searchResults;
      if (options.filterBy) {
        filteredResults = this.applyFilters(searchResults, options.filterBy);
      }

      // Apply sorting
      filteredResults = this.applySorting(filteredResults, options.sortBy, options.sortOrder);

      // Paginate results
      const totalItems = filteredResults.length;
      const totalPages = Math.ceil(totalItems / options.limit);
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const items = filteredResults.slice(startIndex, endIndex);

      const result: PaginatedResult<ContentItem> = {
        items,
        pagination: {
          currentPage: options.page,
          totalPages,
          totalItems,
          hasNext: options.page < totalPages,
          hasPrevious: options.page > 1,
          limit: options.limit
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);

      // Update performance metrics
      const searchTime = performance.now() - startTime;
      this.updateMetrics({
        searchTime,
        itemsLoaded: items.length
      });

      return result;
    } catch (error) {
      console.error('Failed to search with pagination:', error);
      throw error;
    }
  }

  // Lazy loading for large datasets
  async loadItemsLazy(
    startIndex: number, 
    count: number, 
    filters?: PaginationOptions['filterBy']
  ): Promise<ContentItem[]> {
    const cacheKey = this.generateCacheKey('lazy', { startIndex, count, filters });
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allItems = await this.databaseService.getAllItems();
      
      // Apply filters if specified
      let filteredItems = allItems;
      if (filters) {
        filteredItems = this.applyFilters(allItems, filters);
      }

      // Get the requested slice
      const items = filteredItems.slice(startIndex, startIndex + count);
      
      // Cache the result
      this.setCache(cacheKey, items);
      
      return items;
    } catch (error) {
      console.error('Failed to load items lazily:', error);
      throw error;
    }
  }

  // Preload next page for better UX
  async preloadNextPage(currentOptions: PaginationOptions): Promise<void> {
    if (currentOptions.page < 1) return;
    
    const nextPageOptions = {
      ...currentOptions,
      page: currentOptions.page + 1
    };

    try {
      // Load next page in background and cache it
      await this.loadItemsPaginated(nextPageOptions);
    } catch (error) {
      // Silently fail - this is just optimization
      console.warn('Failed to preload next page:', error);
    }
  }

  // Clean up old analytics data for performance
  async cleanupOldAnalytics(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // This would need to be implemented in AnalyticsStorageService
      // For now, we'll just return 0
      console.log(`Would cleanup analytics data older than ${retentionDays} days`);
      
      return 0; // Number of records cleaned
    } catch (error) {
      console.error('Failed to cleanup old analytics:', error);
      throw error;
    }
  }

  // Optimize database performance
  async optimizeDatabase(): Promise<void> {
    try {
      // Clear expired cache entries
      this.clearExpiredCache();
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Database optimization failed:', error);
    }
  }

  // Get current performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Monitor memory usage
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  // Cache management
  private generateCacheKey(type: string, params: any): string {
    return `${type}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Filtering and sorting helpers
  private applyFilters(items: ContentItem[], filters: PaginationOptions['filterBy']): ContentItem[] {
    let filtered = items;

    if (filters?.type) {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    if (filters?.dateRange) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= filters.dateRange!.start && itemDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private applySorting(
    items: ContentItem[], 
    sortBy: PaginationOptions['sortBy'] = 'timestamp', 
    sortOrder: PaginationOptions['sortOrder'] = 'desc'
  ): ContentItem[] {
    return items.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // Performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.updateMetrics({
        memoryUsage: this.getMemoryUsage()
      });
    }, 30000);

    // Clear expired cache every 5 minutes
    setInterval(() => {
      this.clearExpiredCache();
    }, 5 * 60 * 1000);
  }

  private updateMetrics(updates: Partial<PerformanceMetrics>): void {
    this.performanceMetrics = {
      ...this.performanceMetrics,
      ...updates
    };
  }

  // Get performance recommendations
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.performanceMetrics;

    if (metrics.loadTime > 2000) {
      recommendations.push('Consider reducing the number of items loaded per page');
    }

    if (metrics.searchTime > 1000) {
      recommendations.push('Search is slow - consider implementing search indexing');
    }

    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider clearing old data');
    }

    if (metrics.cacheHitRate < 0.3) {
      recommendations.push('Low cache hit rate - consider adjusting cache settings');
    }

    return recommendations;
  }

  // Batch operations for better performance
  async batchDeleteItems(itemIds: string[]): Promise<void> {
    const batchSize = 50; // Process in batches to avoid blocking
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      // Process batch
      await Promise.all(batch.map(id => this.databaseService.deleteItem(id)));
      
      // Clear related cache entries
      this.clearCacheByPattern('items');
      this.clearCacheByPattern('search');
      
      // Allow other operations to run
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}