import { createRouter, createWebHistory } from "vue-router";
import BackendLayout from "@/components/BackendLayout.vue";
import AuthLayout from "@/components/AuthLayout.vue";
import FrontendLayout from "@/components/FrontendLayout.vue";
//路由配置
const backendRoutes = [
  //后台管理相关路由
  {
    path: "/back",
    //重定向
    redirect: "/back/dashboard",
    component: BackendLayout,
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard.vue"),
        meta: {
          title: "数据分析",
          icon: "PieChart",
        },
      },
      {
        path: "knowledge",
        component: () => import("@/views/knowledge.vue"),
        meta: {
          title: "知识文章",
          icon: "ChatLineSquare",
        },
      },
      {
        path: "consultations",
        component: () => import("@/views/consultations.vue"),
        meta: {
          title: "咨询记录",
          icon: "Message",
        },
      },
      {
        path: "emotional",
        component: () => import("@/views/emotional.vue"),
        meta: {
          title: "情绪日志",
          icon: "User",
        },
      },
    ],
  },
  // 用户登陆注册相关，用户鉴权
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        component: () => import("@/views/login.vue"),
        meta: {
          title: "用户登录",
        },
      },
      {
        path: "register",
        component: () => import("@/views/register.vue"),
        meta: {
          title: "用户注册",
        },
      },
    ],
  },
];
const frontendRoutes = [
  {
    path: "/",
    component: FrontendLayout,
    children: [
      {
        path: "",
        redirect: "home",
      },
      {
        path: "home",
        name: "home",
        component: () => import("@/views/home.vue"),
        meta: {
          title: "首页",
          icon: "House",
        },
      },
      {
        path: "consultation",
        component: () => import("@/views/consultation.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "emotion-diary",
        component: () => import("@/views/emotionDiary.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "knowledge",
        component: () => import("@/views/frontendKnowledge.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "knowledge/article/:id",
        component: () => import("@/views/articleDetail.vue"),
        props: true,
        meta: { requiresAuth: true },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHistory(),
  //前台路由和后台路由的合并（合并数组）
  routes: [...backendRoutes, ...frontendRoutes],
});
//前台路由配置

//路由前置守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  if (token) {
    //如果是后台用户 根据usertype判断登录角色
    let userInfo = null;
    try {
      userInfo = JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
      return next("/auth/login");
    }
    if (!userInfo) return next("/auth/login");
    if (userInfo.role === 'admin') {
      if (to.path.startsWith("/back")) {
        // 管理员访问后台，放行
        next();
      } else {
        // 管理员访问非后台页面，强制跳到 dashboard
        next("/back/dashboard");
      }
    } else {
      // 普通用户不能访问后台和登录页
      if (to.path.startsWith("/back") || to.path.startsWith("/auth")) {
        next("/");
      } else {
        next();
      }
    }
  } else {
    if (to.path.startsWith("/back") || to.meta.requiresAuth) {
      next("/auth/login");
    } else {
      next();
    }
  }
});
export default router;
