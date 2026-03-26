import { useState, useMemo } from 'react';

/**
 * ツリー状のタスクリストをフラット化し、開閉状態を加味して表示する行だけを抽出するHook
 */
export function useWbsData(initialTasks = []) {
  // 展開されているタスク(親)のIDリスト。デフォルトでLevel 1は全て展開、または全て閉じるか。
  // ここでは初期状態として全てのLevel 1を開く。
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (taskId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const expandAllToLevel = (level, tasks) => {
    const next = new Set();
    const traverse = (list) => {
      for (const t of list) {
        if (t.level < level && t.has_children) {
          next.add(t.id);
        }
        if (t.children) traverse(t.children);
      }
    };
    traverse(tasks);
    setExpandedIds(next);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // ツリーからフラットな配列を生成
  const visibleTasks = useMemo(() => {
    const result = [];
    
    // DFSでツリーを走査
    const traverse = (nodeList) => {
      for (const node of nodeList) {
        result.push(node);
        // このノードが展開されていて、かつ子要素データがあれば再帰
        if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    
    traverse(initialTasks);
    return result;
  }, [initialTasks, expandedIds]);

  return {
    expandedIds,
    setExpandedIds,
    toggleExpand,
    expandAllToLevel,
    collapseAll,
    visibleTasks
  };
}
