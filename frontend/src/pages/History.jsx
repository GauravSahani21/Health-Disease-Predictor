import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { historyAPI } from '../services/api';
import { History as HistoryIcon, FileText, Image, Trash2, Filter, Brain, ScanFace } from 'lucide-react';
import { SeverityBadge, LoadingSpinner } from '../components/UIComponents';
import toast from 'react-hot-toast';

export const History = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', severity: '' });
  const [pagination, setPagination] = useState({ total: 0, limit: 20, skip: 0 });

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        skip: pagination.skip,
        ...(filter.type && { type: filter.type }),
        ...(filter.severity && { severity: filter.severity }),
      };

      const response = await historyAPI.getHistory(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setQueries(data);
        setPagination(prev => ({ ...prev, hasMore: false }));
      } else {
        setQueries(data.queries || []);
        setPagination(data.pagination || { total: 0, limit: 20, skip: 0 });
      }
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      await historyAPI.deleteQuery(id);
      toast.success('Query deleted successfully');
      fetchHistory();
    } catch (error) {
      toast.error('Failed to delete query');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQueryIcon = (type) => {
    switch (type) {
      case 'text': return <FileText className="h-6 w-6 text-primary-600" />;
      case 'face': return <ScanFace className="h-6 w-6 text-pink-600" />;
      case 'brain': return <Brain className="h-6 w-6 text-purple-600" />;
      default: return <Image className="h-6 w-6 text-green-600" />;
    }
  };

  const getQueryColor = (type) => {
    switch (type) {
      case 'text': return 'bg-primary-100';
      case 'face': return 'bg-pink-100';
      case 'brain': return 'bg-purple-100';
      default: return 'bg-green-100';
    }
  };

  const getQueryTitle = (type) => {
    switch (type) {
      case 'text': return 'Symptom Analysis';
      case 'face': return 'Face Scan Analysis';
      case 'brain': return 'Brain MRI Analysis';
      default: return 'Skin Analysis';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HistoryIcon className="h-8 w-8 text-primary-600 mr-3" />
            Query History
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage your past analyses
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                  className="input-field"
                >
                  <option value="">All</option>
                  <option value="text">Symptom Analysis</option>
                  <option value="image">Skin Analysis</option>
                  <option value="face">Face Scan</option>
                  <option value="brain">Brain MRI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filter.severity}
                  onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
                  className="input-field"
                >
                  <option value="">All</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Query List */}
        {loading ? (
          <LoadingSpinner text="Loading history..." />
        ) : queries.length === 0 ? (
          <div className="card text-center py-12">
            <HistoryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No queries found</p>
            <div className="flex justify-center space-x-4">
              <Link to="/predict-text" className="btn-primary">
                Try Symptom Analysis
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {queries.map((query) => (
              <div key={query._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${getQueryColor(query.type)}`}>
                      {getQueryIcon(query.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {getQueryTitle(query.type)}
                        </span>
                        <SeverityBadge severity={query.severity} />
                        <span className="text-sm text-gray-500">
                          {formatDate(query.createdAt)}
                        </span>
                      </div>

                      {/* Preview Content */}
                      {query.type === 'text' && query.input?.text && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {query.input.text}
                        </p>
                      )}

                      {/* Display Top Prediction / Condition */}
                      {query.modelOutput && query.modelOutput.length > 0 && (
                        <div className="text-sm mb-2">
                          <span className="text-gray-700">Result: </span>
                          <span className="font-medium text-gray-900">
                            {/* Handle different model output structures */}
                            {typeof query.modelOutput[0] === 'string'
                              ? query.modelOutput[0]
                              : (query.modelOutput[0].condition || query.modelOutput[0].label || 'Analysis Complete')}
                          </span>
                          {/* Show confidence if available */}
                          {typeof query.modelOutput[0] !== 'string' && query.modelOutput[0].score && (
                            <span className="text-gray-600 ml-2">
                              ({(query.modelOutput[0].score * 100).toFixed(1)}% confidence)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Image Thumbnail for visual types */}
                      {(query.type === 'image' || query.type === 'face' || query.type === 'brain') &&
                        (query.resources?.imageUrl || query.input?.imageUrl) && (
                          <div className="mt-2">
                            <img
                              src={query.resources?.imageUrl || query.input?.imageUrl}
                              alt="Scan Thumbnail"
                              className="h-16 w-16 object-cover rounded-md border border-gray-200"
                            />
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(query._id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-4"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {pagination.hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setPagination({ ...pagination, skip: pagination.skip + pagination.limit });
                fetchHistory();
              }}
              className="btn-secondary"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
