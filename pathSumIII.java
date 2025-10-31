class Solution {
    int total = 0;
    public int pathSum(TreeNode root, int targetSum) {
        if(root == null) return 0;
        solve(root , targetSum , 0);
        pathSum(root.left , targetSum);
        pathSum(root.right , targetSum);
        return total;
    }
    public void solve(TreeNode r , int t ,long sum){
        if(r == null) return;
        sum+=r.val;
        if(t == sum) total++;
        solve(r.left , t , sum);
        solve(r.right , t , sum);
    }
}
