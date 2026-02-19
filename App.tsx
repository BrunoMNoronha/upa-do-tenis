
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ServiceOrders from './components/ServiceOrders';
import ClientModal from './components/ClientModal';
// import ClientDetailsModal from './components/ClientDetailsModal'; // No longer needed directly here
import ProductModal from './components/ProductModal';
import ServiceModal from './components/ServiceModal';
import Reports from './components/Reports';
import CashFlowView from './components/CashFlowView';
import CashFlowModal from './components/CashFlowModal';
import LoginPage from './components/LoginPage';
import AdminDocs from './components/AdminDocs';
import ClientsView from './components/ClientsView'; // Import new ClientsView
import { useStore } from './store';
import { Client, Product, Service, TransactionType, CashFlow } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State for Mock Data Mode (Preference persists in localStorage)
  const [useMockData, setUseMockData] = useState<boolean>(() => {
    const saved = localStorage.getItem('upa_useMockData');
    return saved ? JSON.parse(saved) : false;
  });

  // State for Current User (Stored in sessionStorage now)
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return sessionStorage.getItem('upa_currentUser'); // Returns string or null
  });

  // New: State for controlling Gemini Insights (default to false, persists in localStorage)
  const [showGeminiInsights, setShowGeminiInsights] = useState<boolean>(() => {
    const saved = localStorage.getItem('upa_showGeminiInsights');
    return saved ? JSON.parse(saved) : false; // Default to false
  });

  // Re-initialize store when useMockData changes
  const store = useStore(useMockData);

  useEffect(() => {
    localStorage.setItem('upa_useMockData', JSON.stringify(useMockData));
  }, [useMockData]);

  // Persist currentUser state to Session Storage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('upa_currentUser', currentUser);
    } else {
      sessionStorage.removeItem('upa_currentUser');
    }
  }, [currentUser]);

  // New: Persist showGeminiInsights state to Local Storage
  useEffect(() => {
    localStorage.setItem('upa_showGeminiInsights', JSON.stringify(showGeminiInsights));
  }, [showGeminiInsights]);


  // Handle Login with License File Content
  const handleLogin = (fileContent: string): boolean => {
    try {
      const license = JSON.parse(fileContent);
      if (license && license.isValidLicense === true) {
        // We can optionally use license.licensedTo for display
        setCurrentUser('licensed_user'); // Grant generic licensed user access
        return true;
      }
      return false; // Invalid license content
    } catch (e) {
      console.error("Failed to parse license file:", e);
      return false; // Invalid JSON
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard'); // Redirect to dashboard, which will then show login
  };


  // State for Client Add/Edit Modal
  const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // ClientDetailsModal state is now managed within ClientsView, but we keep the handlers here
  // because the modal itself might be here if needed globally. For now, it's moved.
  // const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
  // const [clientToView, setClientToView] = useState<Client | null>(null);

  // State for Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // State for Service Add/Edit Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  // State for CashFlow Modal
  const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState(false);
  const [cashFlowTransactionType, setCashFlowTransactionType] = useState<TransactionType>(TransactionType.RECEITA);

  // Handlers for Client Add/Edit Modal
  const handleOpenAddClientModal = () => {
    setClientToEdit(null); // Clear for new client
    setIsClientEditModalOpen(true);
  };

  const handleOpenEditClientModal = (client: Client) => {
    setClientToEdit(client); // Set client to edit
    setIsClientEditModalOpen(true);
  };

  const handleCloseClientEditModal = () => {
    setIsClientEditModalOpen(false);
    setClientToEdit(null); // Clear selected client after closing
  };

  const handleSaveClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> | Client) => {
    if ((clientData as Client).id) { // Check if it's an existing client (has 'id')
      store.updateClient((clientData as Client).id, clientData as Partial<Client>);
    } else {
      store.addClient(clientData as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
    }
    handleCloseClientEditModal();
  };

  // Handlers for Client Details View Modal (now internal to ClientsView, but kept for type signature)
  // const handleOpenClientDetailsModal = (client: Client) => {
  //   setClientToView(client);
  //   setIsClientDetailsModalOpen(true);
  // };

  // const handleCloseClientDetailsModal = () => {
  //   setIsClientDetailsModalOpen(false);
  //   setClientToView(null);
  // };

  // Handlers for Product Add/Edit Modal
  const handleOpenAddProductModal = () => {
    setProductToEdit(null); // Clear for new product
    setIsProductModalOpen(true);
  };

  const handleOpenEditProductModal = (product: Product) => {
    setProductToEdit(product); // Set product to edit
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setProductToEdit(null); // Clear selected product after closing
  };

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Product) => {
    if ((productData as Product).id) { // Check if it's an existing product
      store.updateProduct((productData as Product).id, productData as Partial<Product>);
    } else {
      store.addProduct(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
    }
    handleCloseProductModal();
  };

  // Handlers for Service Add/Edit Modal
  const handleOpenAddServiceModal = () => {
    setServiceToEdit(null); // Clear for new service
    setIsServiceModalOpen(true);
  };

  const handleOpenEditServiceModal = (service: Service) => {
    setServiceToEdit(service); // Set service to edit
    setIsServiceModalOpen(true);
  };

  const handleCloseServiceModal = () => {
    setIsServiceModalOpen(false);
    setServiceToEdit(null); // Clear selected service after closing
  };

  const handleSaveService = (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'> | Service) => {
    if ((serviceData as Service).id) { // Check if it's an existing service
      store.updateService((serviceData as Service).id, serviceData as Partial<Service>);
    } else {
      store.addService(serviceData as Omit<Service, 'id' | 'createdAt' | 'updatedAt'>);
    }
    handleCloseServiceModal();
  };

  // Handlers for CashFlow Modal
  const handleOpenAddRevenueModal = () => {
    setCashFlowTransactionType(TransactionType.RECEITA);
    setIsCashFlowModalOpen(true);
  };

  const handleOpenAddExpenseModal = () => {
    setCashFlowTransactionType(TransactionType.DESPESA);
    setIsCashFlowModalOpen(true);
  };

  const handleCloseCashFlowModal = () => {
    setIsCashFlowModalOpen(false);
  };

  const handleSaveCashFlow = (transaction: Omit<CashFlow, 'id'>) => {
    store.addTransaction(transaction);
    handleCloseCashFlowModal();
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
                 orders={store.orders} 
                 cashFlow={store.cashFlow} 
                 clients={store.clients} 
                 products={store.products}
                 showGeminiInsights={showGeminiInsights} // Pass new state
                 setShowGeminiInsights={setShowGeminiInsights} // Pass new setter
               />;
      case 'orders':
        return (
          <ServiceOrders 
            orders={store.orders} 
            clients={store.clients}
            products={store.products}
            services={store.services}
            createOrder={store.createOrder}
            updateStatus={store.updateOrderStatus}
            addPayment={store.addPayment}
            onOpenAddClientModal={handleOpenAddClientModal}
          />
        );
      case 'clients':
        return (
          <ClientsView 
            clients={store.clients}
            orders={store.orders} // Pass orders for ClientDetailsModal
            onOpenAddClientModal={handleOpenAddClientModal}
            onOpenEditClientModal={handleOpenEditClientModal}
            // onOpenClientDetailsModal={handleOpenClientDetailsModal} // No longer needed here
          />
        );
      case 'inventory':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-gray-800">Produtos em Estoque</h3>
                 <button 
                   onClick={handleOpenAddProductModal}
                   className="bg-primary-light text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary-light/30 hover:bg-primary transition-all"
                 >
                   ＋ Novo Produto
                 </button>
               </div>
               
               <div className="space-y-4">
                 {store.products.length === 0 ? (
                    <p className="text-gray-400 italic text-center py-10">Nenhum produto em estoque. Adicione um!</p>
                 ) : (
                   store.products.map(p => (
                     <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl transition-shadow hover:shadow-md">
                       <div>
                         <p className="font-bold text-gray-800">{p.nome}</p>
                         <p className="text-xs text-gray-500 mb-2">{p.descricao || 'Sem descrição'}</p>
                         <p className="text-xs text-gray-400">Estoque: {p.estoque} un</p>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="font-bold text-primary text-lg">R$ {(p.valor / 100).toFixed(2)}</span>
                         <button 
                           onClick={() => handleOpenEditProductModal(p)}
                           className="text-primary hover:text-primary-dark font-bold text-xs uppercase underline"
                         >
                           Editar
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-gray-800">Serviços Oferecidos</h3>
                 <button 
                   onClick={handleOpenAddServiceModal}
                   className="bg-primary-light text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary-light/30 hover:bg-primary transition-all"
                 >
                   ＋ Novo Serviço
                 </button>
               </div>
               <div className="space-y-4">
                 {store.services.length === 0 ? (
                   <p className="text-gray-400 italic text-center py-10">Nenhum serviço cadastrado. Adicione um!</p>
                 ) : (
                   store.services.map(s => (
                     <div key={s.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl transition-shadow hover:shadow-md">
                       <div>
                         <p className="font-bold text-gray-800">{s.nome}</p>
                         <p className="text-xs text-gray-500 truncate max-w-[200px] mb-2">{s.descricao || 'Sem descrição'}</p>
                         <p className="text-xs text-gray-400">Criado em: {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="font-bold text-primary text-lg">R$ {(s.valor / 100).toFixed(2)}</span>
                         <button 
                           onClick={() => handleOpenEditServiceModal(s)}
                           className="text-primary hover:text-primary-dark font-bold text-xs uppercase underline"
                         >
                           Editar
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </div>
        );
      case 'cashflow':
        return (
          <CashFlowView 
            cashFlow={store.cashFlow} 
            onOpenAddRevenueModal={handleOpenAddRevenueModal} 
            onOpenAddExpenseModal={handleOpenAddExpenseModal} 
          />
        );
      case 'reports':
        return <Reports orders={store.orders} cashFlow={store.cashFlow} />;
      case 'admin':
        // Only render if user is admin (e.g., if a specific license grants 'admin' role)
        // For simplicity, 'licensed_user' from file won't be 'admin' by default
        if (currentUser === 'admin') {
          return <AdminDocs />;
        }
        return <div className="p-8 text-center text-red-500 font-bold">Acesso negado. Esta área é restrita a administradores.</div>;
      default:
        return <div>Em construção...</div>;
    }
  };

  return (
    <>
      {!!currentUser ? (
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          useMockData={useMockData} 
          setUseMockData={setUseMockData} 
          onLogout={handleLogout}
          currentUser={currentUser} // Pass currentUser to Layout
        >
          {renderContent()}
          <ClientModal
            isOpen={isClientEditModalOpen}
            client={clientToEdit}
            onClose={handleCloseClientEditModal}
            onSave={handleSaveClient}
          />
          {/* ClientDetailsModal is now managed by ClientsView */}
          {/* <ClientDetailsModal
            isOpen={isClientDetailsModalOpen}
            client={clientToView}
            orders={store.orders}
            onClose={handleCloseClientDetailsModal}
          /> */}
          <ProductModal
            isOpen={isProductModalOpen}
            product={productToEdit}
            onClose={handleCloseProductModal}
            onSave={handleSaveProduct}
          />
          <ServiceModal
            isOpen={isServiceModalOpen}
            service={serviceToEdit}
            onClose={handleCloseServiceModal}
            onSave={handleSaveService}
          />
          <CashFlowModal
            isOpen={isCashFlowModalOpen}
            initialType={cashFlowTransactionType}
            orders={store.orders}
            onClose={handleCloseCashFlowModal}
            onSave={handleSaveCashFlow}
          />
        </Layout>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;
