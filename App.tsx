import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { Sidebar } from './components/Sidebar';
import { DocumentList } from './components/DocumentList';
import { TrainingList } from './components/TrainingList';
import { StudentList } from './components/StudentList';
import { Login } from './components/Login';
import { ViewState } from './types';

function App() {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>('documents');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to get session:", err);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue"></div>
        </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-[#F2F2F7]">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        onLogout={() => supabase.auth.signOut()} 
      />
      
      <main className="flex-1 ml-64 min-h-screen relative">
         {/* Decorative background blurs for the glass effect */}
        <div className="fixed top-0 left-64 right-0 h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none -z-10" />
        
        <div className="animate-fade-in">
            {currentView === 'documents' && <DocumentList />}
            {currentView === 'students' && <StudentList />}
            {currentView === 'trainings' && <TrainingList />}
        </div>
      </main>
    </div>
  );
}

export default App;