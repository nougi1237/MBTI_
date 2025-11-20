import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';

interface PersonalityTest {
  id: number;
  name: string;
  encryptedScore: string;
  publicValue1: number;
  publicValue2: number;
  timestamp: number;
  creator: string;
  isVerified?: boolean;
  decryptedValue?: number;
}

interface TestQuestion {
  id: number;
  question: string;
  options: string[];
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<PersonalityTest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending" as const, 
    message: "" 
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [testResult, setTestResult] = useState<{type: string; description: string} | null>(null);
  const [selectedTest, setSelectedTest] = useState<PersonalityTest | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [userHistory, setUserHistory] = useState<PersonalityTest[]>([]);
  const [stats, setStats] = useState({ totalTests: 0, verifiedTests: 0, avgScore: 0 });

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting} = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  const questions: TestQuestion[] = [
    {
      id: 1,
      question: "在社交场合中，你通常：",
      options: ["主动与人交谈", "等待别人先开口", "观察周围环境", "寻找安静角落"]
    },
    {
      id: 2,
      question: "做决策时，你更依赖：",
      options: ["逻辑分析", "直觉感受", "他人意见", "过往经验"]
    },
    {
      id: 3,
      question: "面对压力时，你倾向于：",
      options: ["制定计划", "寻求支持", "独自思考", "暂时逃避"]
    },
    {
      id: 4,
      question: "学习新事物时，你更喜欢：",
      options: ["实践操作", "理论学习", "小组讨论", "独自探索"]
    },
    {
      id: 5,
      question: "周末安排，你更可能：",
      options: ["参加聚会", "在家休息", "户外运动", "学习充电"]
    }
  ];

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        console.error('FHEVM初始化失败:', error);
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM初始化失败" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
      } catch (error) {
        console.error('数据加载失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const testsList: PersonalityTest[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          const test: PersonalityTest = {
            id: parseInt(businessId.replace('test-', '')) || Date.now(),
            name: businessData.name,
            encryptedScore: businessId,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            timestamp: Number(businessData.timestamp),
            creator: businessData.creator,
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0
          };
          testsList.push(test);
        } catch (e) {
          console.error('加载测试数据错误:', e);
        }
      }
      
      setTests(testsList);
      updateStats(testsList);
      if (address) {
        setUserHistory(testsList.filter(test => test.creator.toLowerCase() === address.toLowerCase()));
      }
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "数据加载失败" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const updateStats = (testsList: PersonalityTest[]) => {
    const totalTests = testsList.length;
    const verifiedTests = testsList.filter(t => t.isVerified).length;
    const avgScore = totalTests > 0 ? testsList.reduce((sum, t) => sum + t.publicValue1, 0) / totalTests : 0;
    
    setStats({ totalTests, verifiedTests, avgScore });
  };

  const calculateScore = (answers: number[]): number => {
    return answers.reduce((sum, answer) => sum + answer, 0);
  };

  const getPersonalityType = (score: number): {type: string; description: string} => {
    if (score <= 8) return { type: "ISTJ", description: "务实、有责任感，注重细节和传统" };
    if (score <= 12) return { type: "ENFP", description: "热情、有创造力，喜欢新的可能性" };
    if (score <= 16) return { type: "INTJ", description: "战略思考者，独立且目标明确" };
    return { type: "ESFJ", description: "友善、尽责，注重和谐与合作" };
  };

  const createTest = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "请先连接钱包" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    if (answers.length < questions.length) {
      setTransactionStatus({ visible: true, status: "error", message: "请完成所有问题" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return;
    }

    setCreatingTest(true);
    setTransactionStatus({ visible: true, status: "pending", message: "使用Zama FHE创建加密测试..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("获取合约失败");
      
      const totalScore = calculateScore(answers);
      const personality = getPersonalityType(totalScore);
      setTestResult(personality);
      
      const businessId = `test-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, totalScore);
      
      const tx = await contract.createBusinessData(
        businessId,
        `${personality.type}性格测试`,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        totalScore,
        answers.length,
        `MBTI性格测试结果: ${personality.type}`
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "等待交易确认..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: "success", message: "测试创建成功！" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setAnswers([]);
      setCurrentQuestion(0);
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "用户取消交易" 
        : "提交失败: " + (e.message || "未知错误");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingTest(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "请先连接钱包" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        setTransactionStatus({ visible: true, status: "success", message: "数据已在链上验证" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "在链上验证解密..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      setTransactionStatus({ visible: true, status: "success", message: "数据解密验证成功！" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ visible: true, status: "success", message: "数据已在链上验证" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
        await loadData();
        return null;
      }
      
      setTransactionStatus({ visible: true, status: "error", message: "解密失败: " + (e.message || "未知错误") });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex + 1;
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (contract) {
        const available = await contract.isAvailable();
        setTransactionStatus({ visible: true, status: "success", message: "系统可用性检查成功" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "可用性检查失败" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>🔐 隐私性格测试</h1>
            <p>MBTI_Zama - 全同态加密保护</p>
          </div>
          <div className="header-actions">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="brain-icon">🧠</div>
            <h2>连接钱包开始加密性格测试</h2>
            <p>使用Zama FHE技术，您的测试数据全程加密，保护隐私安全</p>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>答案加密</h3>
                <p>测试答案使用同态加密技术保护</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>同态分析</h3>
                <p>在加密状态下进行性格分析计算</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤝</div>
                <h3>社交匹配</h3>
                <p>安全匹配相似性格的用户</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="puzzle-spinner">🧩</div>
        <p>初始化FHE加密系统...</p>
        <p className="loading-note">正在准备同态加密环境</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="puzzle-spinner">🔐</div>
      <p>加载加密性格测试系统...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <h1>🧩 隐私MBTI测试</h1>
          <p>FHE全同态加密保护您的性格数据</p>
        </div>
        
        <div className="header-actions">
          <button onClick={checkAvailability} className="availability-btn">检查系统</button>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">开始测试</button>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
        </div>
      </header>

      <div className="main-content">
        <div className="stats-section">
          <div className="stat-card gradient-card">
            <h3>总测试数</h3>
            <div className="stat-value">{stats.totalTests}</div>
          </div>
          <div className="stat-card gradient-card">
            <h3>已验证测试</h3>
            <div className="stat-value">{stats.verifiedTests}</div>
          </div>
          <div className="stat-card gradient-card">
            <h3>平均分数</h3>
            <div className="stat-value">{stats.avgScore.toFixed(1)}</div>
          </div>
        </div>

        <div className="content-grid">
          <div className="test-history">
            <h2>我的测试记录</h2>
            <div className="history-list">
              {userHistory.map((test, index) => (
                <div key={index} className="history-item glass-card">
                  <div className="test-type">{test.name}</div>
                  <div className="test-meta">
                    <span>分数: {test.publicValue1}</span>
                    <span>时间: {new Date(test.timestamp * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className={`status-badge ${test.isVerified ? 'verified' : 'pending'}`}>
                    {test.isVerified ? '✅ 已验证' : '🔓 待验证'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="public-tests">
            <div className="section-header">
              <h2>公开测试记录</h2>
              <button onClick={loadData} className="refresh-btn" disabled={isRefreshing}>
                {isRefreshing ? "刷新中..." : "刷新"}
              </button>
            </div>
            <div className="tests-grid">
              {tests.map((test, index) => (
                <div key={index} className="test-card glass-card" onClick={() => setSelectedTest(test)}>
                  <div className="card-header">
                    <h3>{test.name}</h3>
                    <span className="score-badge">{test.publicValue1}分</span>
                  </div>
                  <div className="card-content">
                    <p>创建者: {test.creator.substring(0, 8)}...{test.creator.substring(36)}</p>
                    <p>问题数: {test.publicValue2}</p>
                    <p>时间: {new Date(test.timestamp * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="card-footer">
                    <div className={`encryption-status ${test.isVerified ? 'verified' : 'encrypted'}`}>
                      {test.isVerified ? '🔓 已解密' : '🔒 加密中'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="test-modal glass-card">
            <div className="modal-header">
              <h2>MBTI性格测试</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-content">
              {currentQuestion < questions.length ? (
                <div className="question-section">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                  <h3>问题 {currentQuestion + 1}/{questions.length}</h3>
                  <p className="question-text">{questions[currentQuestion].question}</p>
                  <div className="options-grid">
                    {questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        className="option-btn"
                        onClick={() => handleAnswerSelect(index)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="results-section">
                  <h3>测试完成！</h3>
                  {testResult && (
                    <div className="personality-result">
                      <div className="result-type">{testResult.type}</div>
                      <p className="result-desc">{testResult.description}</p>
                    </div>
                  )}
                  <div className="action-buttons">
                    <button onClick={() => setCurrentQuestion(0)} className="retry-btn">重新测试</button>
                    <button 
                      onClick={createTest} 
                      disabled={creatingTest || isEncrypting}
                      className="encrypt-btn"
                    >
                      {creatingTest || isEncrypting ? "加密中..." : "🔐 加密存储结果"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTest && (
        <div className="modal-overlay">
          <div className="detail-modal glass-card">
            <div className="modal-header">
              <h2>测试详情</h2>
              <button onClick={() => setSelectedTest(null)} className="close-btn">×</button>
            </div>
            
            <div className="modal-content">
              <div className="test-info">
                <h3>{selectedTest.name}</h3>
                <p>总分: {selectedTest.publicValue1}</p>
                <p>问题数: {selectedTest.publicValue2}</p>
                <p>创建时间: {new Date(selectedTest.timestamp * 1000).toLocaleString()}</p>
              </div>
              
              <div className="encryption-section">
                <h4>加密状态</h4>
                <div className="status-display">
                  {selectedTest.isVerified ? (
                    <div className="verified-status">
                      <span className="status-icon">✅</span>
                      <span>已解密验证 - 分数: {selectedTest.decryptedValue}</span>
                    </div>
                  ) : (
                    <div className="encrypted-status">
                      <span className="status-icon">🔒</span>
                      <span>数据已加密 - 等待验证解密</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => decryptData(selectedTest.encryptedScore)}
                  disabled={isDecrypting}
                  className="decrypt-btn"
                >
                  {isDecrypting ? "解密中..." : selectedTest.isVerified ? "✅ 已验证" : "🔓 验证解密"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {transactionStatus.visible && (
        <div className="notification">
          <div className={`notification-content ${transactionStatus.status}`}>
            <div className="notification-icon">
              {transactionStatus.status === "pending" && <div className="spinner">⏳</div>}
              {transactionStatus.status === "success" && "✅"}
              {transactionStatus.status === "error" && "❌"}
            </div>
            <span>{transactionStatus.message}</span>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>🔐 使用Zama FHE技术 - 您的隐私数据全程加密保护</p>
        <div className="footer-links">
          <span>MBTI_Zama隐私性格测试</span>
          <span>|</span>
          <span>同态加密技术</span>
          <span>|</span>
          <span>数据安全保护</span>
        </div>
      </footer>
    </div>
  );
};

export default App;

