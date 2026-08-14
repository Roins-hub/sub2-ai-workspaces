import type { Edge, Node, Viewport } from '@xyflow/react'
import dagre from 'dagre'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Node dimensions for layout calculation
const NODE_WIDTH = 320
const NODE_HEIGHT = 180

export type MessageRole = 'user' | 'ai'

export interface MessageNodeData extends Record<string, unknown> {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  parentId: string | null
  childIds: string[]
  isActive: boolean
  isOnActivePath: boolean
}

export interface ConversationFlowState {
  // Core state
  nodes: Node<MessageNodeData>[]
  edges: Edge[]
  viewport: Viewport

  // Selection state
  activeNodeId: string | null
  activePath: string[] // IDs of nodes from root to active node

  // Node counter for unique IDs
  nodeIdCounter: number

  // Actions
  setNodes: (nodes: Node<MessageNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  setViewport: (viewport: Viewport) => void

  addMessage: (parentId: string | null, content: string, role: MessageRole) => string
  updateNodeContent: (nodeId: string, content: string) => void
  deleteNode: (nodeId: string) => void

  setActiveNode: (nodeId: string | null) => void
  calculateActivePath: (nodeId: string | null) => string[]

  applyLayout: () => void
  clearFlow: () => void

  // Initialization
  initializeFlow: () => void
}

// Helper function to get dagre-layouted elements
function getLayoutedElements(
  nodes: Node<MessageNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  if (nodes.length === 0) return { nodes: [], edges }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Helper to calculate path from root to a specific node
function calculatePathToNode(nodeId: string, nodes: Node<MessageNodeData>[]): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  while (currentId) {
    path.unshift(currentId)
    const node = nodeMap.get(currentId)
    currentId = node?.data?.parentId ?? null
  }

  return path
}

export const useConversationFlowStore = create<ConversationFlowState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    activeNodeId: null,
    activePath: [],
    nodeIdCounter: 0,

    // Basic setters
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setViewport: (viewport) => set({ viewport }),

    // Add a new message node
    addMessage: (parentId, content, role) => {
      const state = get()
      const newId = `msg-${state.nodeIdCounter + 1}`
      const timestamp = Date.now()

      // Create new node
      const newNode: Node<MessageNodeData> = {
        id: newId,
        type: 'message',
        position: { x: 0, y: 0 }, // Will be calculated by layout
        data: {
          id: newId,
          role,
          content,
          timestamp,
          parentId,
          childIds: [],
          isActive: true,
          isOnActivePath: true,
        },
      }

      // Update parent's childIds if parent exists
      const updatedNodes = state.nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            data: {
              ...node.data,
              childIds: [...node.data.childIds, newId],
            },
          }
        }
        return node
      })

      // Add new node
      const nodesWithNew = [...updatedNodes, newNode]

      // Create edge if there's a parent
      const newEdges = [...state.edges]
      if (parentId) {
        newEdges.push({
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          type: 'smoothstep',
          animated: false,
        })
      }

      // Apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodesWithNew,
        newEdges
      )

      // Calculate new active path
      const newActivePath = calculatePathToNode(newId, layoutedNodes)

      // Update isActive and isOnActivePath for all nodes
      const finalNodes = layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === newId,
          isOnActivePath: newActivePath.includes(node.id),
        },
      }))

      // Update edge styles based on active path
      const finalEdges = layoutedEdges.map((edge) => ({
        ...edge,
        className:
          newActivePath.includes(edge.source) && newActivePath.includes(edge.target)
            ? 'active-edge'
            : 'inactive-edge',
        animated: newActivePath.includes(edge.source) && newActivePath.includes(edge.target),
      }))

      set({
        nodes: finalNodes,
        edges: finalEdges,
        nodeIdCounter: state.nodeIdCounter + 1,
        activeNodeId: newId,
        activePath: newActivePath,
      })

      return newId
    },

    // Update node content
    updateNodeContent: (nodeId, content) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, content } } : node
        ),
      }))
    },

    // Delete a node and its descendants
    deleteNode: (nodeId) => {
      const state = get()

      // Find all descendant node IDs
      const nodesToDelete = new Set<string>()
      const findDescendants = (id: string) => {
        nodesToDelete.add(id)
        const node = state.nodes.find((n) => n.id === id)
        if (node?.data.childIds) {
          for (const childId of node.data.childIds) {
            findDescendants(childId)
          }
        }
      }
      findDescendants(nodeId)

      // Find the parent of the deleted node
      const deletedNode = state.nodes.find((n) => n.id === nodeId)
      const parentId = deletedNode?.data.parentId

      // Filter out deleted nodes and update parent's childIds
      const filteredNodes = state.nodes
        .filter((node) => !nodesToDelete.has(node.id))
        .map((node) => {
          if (node.id === parentId) {
            return {
              ...node,
              data: {
                ...node.data,
                childIds: node.data.childIds.filter((id) => id !== nodeId),
              },
            }
          }
          return node
        })

      // Filter out edges
      const filteredEdges = state.edges.filter(
        (edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
      )

      // Re-apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        filteredNodes,
        filteredEdges
      )

      // Update active node if it was deleted
      const newActiveNodeId = nodesToDelete.has(state.activeNodeId ?? '')
        ? (parentId ?? null)
        : state.activeNodeId

      // Recalculate active path
      const newActivePath = newActiveNodeId
        ? calculatePathToNode(newActiveNodeId, layoutedNodes)
        : []

      // Update node states
      const finalNodes = layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === newActiveNodeId,
          isOnActivePath: newActivePath.includes(node.id),
        },
      }))

      set({
        nodes: finalNodes,
        edges: layoutedEdges,
        activeNodeId: newActiveNodeId,
        activePath: newActivePath,
      })
    },

    // Set active node and update path highlighting
    setActiveNode: (nodeId) => {
      const state = get()
      const newActivePath = nodeId ? calculatePathToNode(nodeId, state.nodes) : []

      // Update all nodes' active states
      const updatedNodes = state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === nodeId,
          isOnActivePath: newActivePath.includes(node.id),
        },
      }))

      // Update edge styles
      const updatedEdges = state.edges.map((edge) => ({
        ...edge,
        className:
          newActivePath.includes(edge.source) && newActivePath.includes(edge.target)
            ? 'active-edge'
            : 'inactive-edge',
        animated: newActivePath.includes(edge.source) && newActivePath.includes(edge.target),
      }))

      set({
        nodes: updatedNodes,
        edges: updatedEdges,
        activeNodeId: nodeId,
        activePath: newActivePath,
      })
    },

    // Calculate path from root to node
    calculateActivePath: (nodeId) => {
      if (!nodeId) return []
      return calculatePathToNode(nodeId, get().nodes)
    },

    // Apply layout to all nodes
    applyLayout: () => {
      const state = get()
      const { nodes: layoutedNodes, edges } = getLayoutedElements(state.nodes, state.edges)
      set({ nodes: layoutedNodes, edges })
    },

    // Clear all flow state
    clearFlow: () => {
      set({
        nodes: [],
        edges: [],
        activeNodeId: null,
        activePath: [],
        nodeIdCounter: 0,
      })
    },

    // Initialize with a root node
    initializeFlow: () => {
      const state = get()
      if (state.nodes.length === 0) {
        // Flow is empty, ready for first message
      }
    },
  }))
)
